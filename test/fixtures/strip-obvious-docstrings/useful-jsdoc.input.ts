/**
 * Fetches user data from the API.
 * @param id - The user's UUID
 * @throws {NotFoundError} If user doesn't exist
 * @example getUserById("abc-123")
 */
function getUserById(id: string) {
  return api.get(`/users/${id}`);
}
