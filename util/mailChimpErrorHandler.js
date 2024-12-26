function handleMailchimpError(err) {
  console.log("The err", err);
  let statusCode;
  let errorMessage;
  if (err.status === 400 && err.response?.body?.detail) {
    // Handle payload validation errors or like if already exist segment
    statusCode = 400;
    errorMessage =
      err.response?.body?.detail ===
      "The resource submitted could not be validated. For field-specific details, see the 'errors' array."
        ? "Invalid value"
        : err.response?.body?.detail;
  } else if (err.status === 400 && err.response?.body?.errors) {
    // Handle field level errors
    statusCode = 400;
    errorMessage = err.response?.body?.errors;
  } else if (err.status === 401) {
    // Handle unauthorized error (e.g., invalid API key)
    statusCode = 401;
    errorMessage = "Unauthorized: Invalid mailchimp API key";
  } else if (err.status === 404) {
    // Handle not found error (e.g., resource not found)
    statusCode = 401;
    errorMessage = "Resource not found in your account";
  } else if (err.status === 409 && err.response?.body?.errors) {
    // Handle conflict error (e.g., duplicate field)
    statusCode = 409;
    errorMessage = "Conflict: Duplicate field";
  } else {
    // Handle other Mailchimp API errors
    statusCode = 500; // Default status code for other errors
    errorMessage = "Error in mailchimp service";
  }
  const error = new Error(errorMessage);
  error.statusCode = statusCode;
  throw error;
}

module.exports = handleMailchimpError;
