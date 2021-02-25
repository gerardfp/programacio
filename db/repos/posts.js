class ProductsRepository {
    constructor(db, pgp) {
        this.db = db;
    }
    
    async all() {
        return this.db.any('SELECT * FROM post');
    }
}


module.exports = ProductsRepository;