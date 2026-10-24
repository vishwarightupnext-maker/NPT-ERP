const express = require('express');
const router = express.Router();
const {
  getDrivers, getDriverById, createDriver, updateDriver, updateDriverMedia,
  uploadDriverDocument, updateDriverStatus, updateDriverOperationalStatus,
  getDriverOverview, getComplianceAlerts, sendOtp, verifyOtp, getOtpLogs,
} = require('../controllers/driverController');
const { protect, protectAny } = require('../middleware/auth');
const upload = require('../middleware/upload');

const registrationUpload = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'drivingLicenseDoc', maxCount: 1 },
  { name: 'aadhaarCardDoc', maxCount: 1 },
  { name: 'panCardDoc', maxCount: 1 },
  { name: 'passportDoc', maxCount: 1 },
  { name: 'medicalCertificateDoc', maxCount: 1 },
  { name: 'policeVerificationDoc', maxCount: 1 },
  { name: 'experienceCertificateDoc', maxCount: 1 },
]);
const mediaUpload = upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]);

router.get('/compliance/alerts', protectAny, getComplianceAlerts);
router.get('/otp/logs',          protectAny, getOtpLogs);
router.post('/otp/send',         protectAny, sendOtp);
router.post('/otp/verify',       protectAny, verifyOtp);

router.get('/',                       protectAny, getDrivers);
router.post('/',                      protectAny, registrationUpload, createDriver);
router.get('/:id',                    protectAny, getDriverById);
router.patch('/:id',                  protectAny, updateDriver);
router.patch('/:id/media',            protectAny, mediaUpload, updateDriverMedia);
router.patch('/:id/documents',        protectAny, upload.single('file'), uploadDriverDocument);
router.patch('/:id/status',           protect,    updateDriverStatus);             // SuperAdmin approves
router.patch('/:id/operational-status', protectAny, updateDriverOperationalStatus);
router.get('/:id/overview',           protectAny, getDriverOverview);

module.exports = router;
