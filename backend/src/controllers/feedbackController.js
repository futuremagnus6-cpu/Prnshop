const Feedback = require('../models/Feedback');
const Alert = require('../models/Alert');
const { paginate } = require('../utils/helpers');

// @desc    Submit feedback (public)
// @route   POST /api/feedback
const submitFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.create(req.body);

    // Notify admin
    await Alert.create({
      type: 'new_feedback',
      message: `New feedback from ${feedback.name}`,
      severity: 'info',
      relatedTo: { model: 'Feedback', id: feedback._id },
    });

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all feedback (admin)
// @route   GET /api/feedback
const getFeedback = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const [feedback, total] = await Promise.all([
      Feedback.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Feedback.countDocuments(),
    ]);

    res.json({
      feedback,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark feedback as read
// @route   PUT /api/feedback/:id/read
const markFeedbackRead = async (req, res, next) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { isRead: true }, { returnDocument: 'after' });
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    res.json({ message: 'Feedback marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
const deleteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    res.json({ message: 'Feedback deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitFeedback, getFeedback, markFeedbackRead, deleteFeedback };
