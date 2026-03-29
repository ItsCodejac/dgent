class User {
  constructor(public name: string) {}
}

function getById(id: string) {
  return db.find(id);
}

const count = items.length;
