import express from 'express';
import {
  createUser,
  getAllUsers,
  blockOrUnblockUser,
} from '../controllers/users.controller.mjs';

const router = express.Router();

router.post('/', createUser);             
router.get('/', getAllUsers);               
router.put('/:id', blockOrUnblockUser);    

export default router;                      