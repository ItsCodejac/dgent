/** Gets the user by ID */
function getUserById(id: string) {
  return db.find(id);
}
