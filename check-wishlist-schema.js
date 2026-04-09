"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_config_1 = require("./src/config/db.config");
async function checkWishlistSchema() {
    try {
        if (!db_config_1.dataSource.isInitialized) {
            await db_config_1.dataSource.initialize();
        }
        const queryRunner = db_config_1.dataSource.createQueryRunner();
        const table = await queryRunner.getTable('wishlists');
        if (table) {
            console.log('Columns in wishlists:', table.columns.map(c => c.name));
        }
        else {
            console.log('Table wishlists not found');
        }
        await db_config_1.dataSource.destroy();
    }
    catch (err) {
        console.error('Error checking schema:', err);
    }
}
checkWishlistSchema();
//# sourceMappingURL=check-wishlist-schema.js.map