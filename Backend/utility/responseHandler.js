class ResposneHandler {
  static success(res, data, message = 'success', statuscode = 200) {
    return res.status(statuscode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(
    res,
    message = 'Internal server error',
    statuscode = 500,
    errors = null
  ) {
    return res.status(statuscode).json({
      success: false,
      message,
      errors,

      timestamp: new Date().toISOString(),
    });
  }

  static ValidationError(res, errors) {
    return this.error(res, 'validation failed', 400, errors);
  }

  static not;
}
