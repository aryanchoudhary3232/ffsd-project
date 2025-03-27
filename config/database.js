const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Path to data.json file
const dataJsonPath = path.join(__dirname, '../data/data.json');

// Create a database connection
const dbPath = path.join(__dirname, '../data/users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Check if users table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, table) => {
            if (err) {
                console.error('Error checking if users table exists:', err.message);
                return;
            }
            
            if (!table) {
                // Table doesn't exist, create it with the new schema
                createUsersTable();
            } else {
                // Table exists, check its structure
                db.all("PRAGMA table_info(users)", (err, columns) => {
                    if (err) {
                        console.error('Error getting table info:', err.message);
                        return;
                    }
                    
                    // Log the current table structure
                    console.log('Current users table structure:', columns.map(col => col.name));
                    
                    // Check if 'name' column exists
                    const nameColumnExists = columns.some(col => col.name === 'name');
                    if (!nameColumnExists) {
                        // 'name' column doesn't exist, but 'username' might
                        const usernameColumnExists = columns.some(col => col.name === 'username');
                        if (usernameColumnExists) {
                            console.log("Found 'username' column instead of 'name'");
                            // We'll modify our queries to use username instead of name
                        } else {
                            // Try to alter the table (might not work if SQLite version is old)
                            db.run("ALTER TABLE users ADD COLUMN name TEXT", (err) => {
                                if (err) {
                                    console.error('Failed to add name column:', err.message);
                                    console.log('Will attempt to recreate the table with the proper schema');
                                    recreateUsersTable(columns);
                                } else {
                                    console.log('Added name column to users table');
                                }
                            });
                        }
                    }
                });
            }
        });
    }
});

// Function to create users table
function createUsersTable() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,  /* Using username for compatibility */
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            joinDate TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table created successfully');
        }
    });
}

// Function to recreate the users table with proper schema
function recreateUsersTable(existingColumns) {
    // First back up the data
    db.all("SELECT * FROM users", (err, rows) => {
        if (err) {
            console.error('Error backing up users data:', err.message);
            return;
        }
        
        // Drop the table
        db.run("DROP TABLE IF EXISTS users", (err) => {
            if (err) {
                console.error('Error dropping users table:', err.message);
                return;
            }
            
            // Create new table
            createUsersTable();
            
            // Restore data if there was any
            if (rows && rows.length) {
                console.log(`Restoring ${rows.length} user records`);
                
                // Map column names for each row
                rows.forEach(row => {
                    // Determine appropriate field mappings based on existing columns
                    const fieldMappings = {};
                    existingColumns.forEach(col => {
                        if (col.name === 'username') {
                            fieldMappings.username = row.username || row.name;
                        } else {
                            fieldMappings[col.name] = row[col.name];
                        }
                    });
                    
                    // Insert with appropriate field names
                    const fields = Object.keys(fieldMappings).join(', ');
                    const placeholders = Object.keys(fieldMappings).map(() => '?').join(', ');
                    const values = Object.values(fieldMappings);
                    
                    db.run(`INSERT INTO users (${fields}) VALUES (${placeholders})`, values, (err) => {
                        if (err) {
                            console.error('Error restoring user data:', err.message);
                        }
                    });
                });
            }
        });
    });
}

// Function to save user to both SQLite and data.json
db.saveUser = function(userData) {
    return new Promise((resolve, reject) => {
        // Check the structure of the users table first
        db.all("PRAGMA table_info(users)", (err, columns) => {
            if (err) {
                console.error('Error checking table structure:', err.message);
                return reject(err);
            }
            
            // Determine the field to use for the user's name
            const nameField = columns.some(col => col.name === 'name') ? 'name' : 'username';
            
            // Build the SQL query based on the actual table structure
            let fields = [];
            let placeholders = [];
            let values = [];
            
            // Map user data to table columns
            if (columns.some(col => col.name === nameField)) {
                fields.push(nameField);
                placeholders.push('?');
                values.push(userData.name);
            }
            
            if (columns.some(col => col.name === 'email')) {
                fields.push('email');
                placeholders.push('?');
                values.push(userData.email);
            }
            
            if (columns.some(col => col.name === 'password')) {
                fields.push('password');
                placeholders.push('?');
                values.push(userData.password);
            }
            
            if (columns.some(col => col.name === 'role')) {
                fields.push('role');
                placeholders.push('?');
                values.push(userData.role || 'student');
            }
            
            if (columns.some(col => col.name === 'joinDate')) {
                fields.push('joinDate');
                placeholders.push('?');
                values.push(userData.joinDate || new Date().toISOString().split('T')[0]);
            }
            
            if (fields.length === 0) {
                return reject(new Error("No valid fields found for user data"));
            }
            
            // Build the SQL query
            const sql = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            console.log('SQL Insert Query:', sql);
            console.log('Values:', values);
            
            // Execute the query
            this.run(sql, values, function(err) {
                if (err) {
                    console.error('Error saving user to SQLite:', err.message);
                    return reject(err);
                }
                
                // Now also save to data.json
                try {
                    let dataJson = { users: [], courses: [], progress: [], carts: [], orders: [] };
                    
                    // Read existing data if file exists
                    if (fs.existsSync(dataJsonPath)) {
                        const fileData = fs.readFileSync(dataJsonPath, 'utf8');
                        try {
                            dataJson = JSON.parse(fileData);
                        } catch (parseErr) {
                            console.error('Error parsing data.json:', parseErr);
                        }
                    }
                    
                    // Create a new user object for data.json
                    const newUser = {
                        id: userData.id || String(Date.now()),
                        name: userData.name,
                        email: userData.email,
                        password: userData.password,
                        role: userData.role || "student",
                        joinDate: userData.joinDate || new Date().toISOString().split('T')[0],
                        enrolledCourses: userData.enrolledCourses || [],
                        completedCourses: userData.completedCourses || []
                    };
                    
                    // Add user to array
                    dataJson.users.push(newUser);
                    
                    // Write back to file
                    fs.writeFileSync(dataJsonPath, JSON.stringify(dataJson, null, 2), 'utf8');
                    console.log('User data saved to both SQLite and data.json');
                    
                    resolve({
                        sqliteId: this.lastID,
                        jsonId: newUser.id,
                        user: newUser
                    });
                } catch (jsonErr) {
                    console.error('Error saving user to data.json:', jsonErr);
                    // Even if data.json save fails, we return success since SQLite worked
                    resolve({ sqliteId: this.lastID });
                }
            });
        });
    });
};

module.exports = db;
