import express from 'express';
import { handleScan } from '../controllers/scanController.js';

const router = express.Router();

router.post('/', handleScan);

export default router;
