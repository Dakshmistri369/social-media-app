const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Otp  = require('../models/Otp');
const { validatePassword } = require('../utils/passwordValidator');
const { hasAbusiveLanguage } = require('../utils/badWordsFilter');
const twilio = require('twilio');

// Initialize Twilio client if credentials exist
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}


const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '1h',
  });

// @POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    if (!username || !email || !password || !name)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    // Prevent registrations with abusive usernames, names, or emails
    if (hasAbusiveLanguage(username) || hasAbusiveLanguage(name) || hasAbusiveLanguage(email)) {
      return res.status(400).json({
        success: false,
        message: 'Registration blocked: Abusive, profane, or inappropriate language is strictly prohibited.'
      });
    }

    // Validate password strength before registering
    const pwdCheck = validatePassword(password, { username, email, name });
    if (!pwdCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet the strong password criteria: ' + pwdCheck.errors.join(' '),
        errors: pwdCheck.errors
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser)
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Username taken',
      });

    const user = await User.create({ username, email, password, name });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    if (hasAbusiveLanguage(email)) {
      return res.status(400).json({
        success: false,
        message: 'Login blocked: Abusive, profane, or inappropriate language is strictly prohibited.'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Validate password strength before allowing login
    const pwdCheck = validatePassword(password, { username: user.username, email: user.email, name: user.name });
    if (!pwdCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Login blocked: Your password does not meet the current security criteria. Details: ' + pwdCheck.errors.join(' '),
        errors: pwdCheck.errors
      });
    }

    const token = generateToken(user._id);
    res.json({ success: true, token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followers', 'username name avatar')
      .populate('following', 'username name avatar');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/auth/send-otp
exports.sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Validation for Indian phone number: starts with +91 followed by 10 digits
    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number format. Must start with +91 followed by a 10-digit number.' 
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save/Update in DB with the 5 minutes TTL
    await Otp.findOneAndUpdate(
      { phoneNumber },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Print OTP in terminal for convenience
    console.log(`\n--- [OTP VERIFICATION] ---\nPhone: ${phoneNumber}\nOTP Code: ${otp}\n---------------------------\n`);

    let smsSent = false;
    let smsError = null;

    const bulkBlasterApiKey = process.env.BULKBLASTER_API_KEY || 'bb_LqahQ0ROxl28b1ahmnClfsvOJJ4o5t3U';

    if (bulkBlasterApiKey) {
      try {
        const cleanPhone = phoneNumber.replace(/^\+91/, '');
        const messageText = `[LinkUp] Your verification code is ${otp}. Valid for 5 minutes.`;

        console.log(`Sending Bulk Blaster SMS to ${cleanPhone}...`);
        const response = await fetch("https://bulkblaster-india-sms-lc-290441563653.asia-south1.run.app/send-sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            apiKey: bulkBlasterApiKey,
            phone: cleanPhone,
            message: messageText
          })
        });

        const data = await response.json();
        console.log("Bulk Blaster Response:", data);

        if (response.ok && data.success) {
          smsSent = true;
          console.log(`✅ SMS successfully sent via Bulk Blaster to ${phoneNumber}`);
        } else {
          smsError = data.message || `Bulk Blaster API returned status ${response.status}`;
          console.error(`❌ Bulk Blaster failed to send SMS:`, smsError);
        }
      } catch (error) {
        console.error(`❌ Failed to make request to Bulk Blaster:`, error.message);
        smsError = error.message;
      }
    }

    // Fallback to Twilio if Bulk Blaster was not configured or failed
    if (!smsSent && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        console.log(`Attempting Twilio SMS fallback to ${phoneNumber}...`);
        await twilioClient.messages.create({
          body: `[LinkUp] Your verification code is ${otp}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        smsSent = true;
        smsError = null; // Clear Bulk Blaster error as we succeeded with Twilio
        console.log(`✅ SMS successfully sent via Twilio to ${phoneNumber}`);
      } catch (error) {
        console.error(`❌ Failed to send SMS via Twilio fallback to ${phoneNumber}:`, error.message);
        smsError = `Bulk Blaster error: ${smsError || 'none'}. Twilio error: ${error.message}`;
      }
    }

    if (!smsSent) {
      console.log(`⚠️ SMS not sent via Bulk Blaster or Twilio. Falling back to log/demo mode.`);
    }

    // Return the response. If SMS was sent, we hide the OTP from the API response for security.
    res.status(200).json({ 
      success: true, 
      message: smsSent ? 'OTP sent to your mobile number.' : 'OTP sent successfully (Demo Mode).',
      otp: smsSent ? undefined : otp, // Hide OTP from API response if sent via real SMS!
      smsError: smsError || undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }

    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number format. Must start with +91 followed by a 10-digit number.' 
      });
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ phoneNumber, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // OTP verified, remove it
    await Otp.deleteOne({ _id: otpRecord._id });

    // Check if user exists
    let user = await User.findOne({ phoneNumber });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const phoneDigits = phoneNumber.slice(3); // 10 digits
      const username = `user_${phoneDigits}`;
      const name = `User ${phoneDigits}`;
      const email = `${phoneDigits}@linkup.com`;
      // Generate a secure password that passes validatePassword
      const password = `OtpUser_${Math.random().toString(36).substring(2, 6).toUpperCase()}9_Pass!`;

      // Check if temporary credentials exist (edge case)
      const existing = await User.findOne({ $or: [{ email }, { username }] });
      if (existing) {
        const randSuffix = Math.floor(100 + Math.random() * 900);
        user = await User.create({
          username: `${username}_${randSuffix}`,
          email: `${phoneDigits}_${randSuffix}@linkup.com`,
          password,
          name,
          phoneNumber,
          isVerified: true
        });
      } else {
        user = await User.create({
          username,
          email,
          password,
          name,
          phoneNumber,
          isVerified: true
        });
      }
    }

    const token = generateToken(user._id);
    res.status(200).json({ 
      success: true, 
      token, 
      user: user.toJSON(),
      isNewUser 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
