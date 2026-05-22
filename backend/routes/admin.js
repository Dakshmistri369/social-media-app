const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  listUsers, getStats, deleteUser,
  updateRole, toggleVerify, createUser,
} = require('../controllers/adminController');

router.use(protect, adminOnly); // all admin routes require auth + admin role

router.get('/stats',              getStats);
router.get('/users',              listUsers);
router.post('/users',             createUser);
router.delete('/users/:id',       deleteUser);
router.put('/users/:id/role',     updateRole);
router.put('/users/:id/verify',   toggleVerify);

module.exports = router;
