const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ProfileHandler = require('../controllers/userProfile');
const PostHandler = require('../controllers/userPostController');

router.get('/profile', auth, (req, res) => {
  res.json({
    message: `the user Id of the user is ${req.user.email} and id is ${req.user.userId}`,
  });
});

router.put('/userProfile', auth, ProfileHandler.updateProfile);
router.get('/userProfile', auth, ProfileHandler.getMyProfile);
router.delete('/userProfile', auth, ProfileHandler.deleteProfile);
router.post('/userProfile', auth, ProfileHandler.createProfile);
router.post('/createPost', auth, PostHandler.CreatePost);
router.get('/getMyposts', auth, PostHandler.GetMyPosts);
router.get(`/Profile/:userId`, ProfileHandler.getuserProfile);
router.get('/allPosts', PostHandler.getallPosts);
router.get('/user/:displayName', ProfileHandler.getProfile);
router.post('/reqList/:userId', auth, ProfileHandler.sendRequest);
router.post('/accept', auth, ProfileHandler.acccepRequest);
router.post('/reject', auth, ProfileHandler.rejectReq);
router.get('/userReq', auth, ProfileHandler.Reqlist);
router.get('/friends', auth, ProfileHandler.friends);
router.get('/friendList/:id', ProfileHandler.friendList);
module.exports = router;
