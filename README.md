# Zainab Books Management System — Ultra Pro Max

A responsive Express + MySQL CRUD website with a premium natural colour palette, real photography backgrounds, search/filtering, and dropdown-based book selection for Update, Delete, and List One.

## Existing database expected

This project is configured for the database/schema and table shown in the supplied MySQL Workbench screenshot:

- Database: `books management system`
- Table: `books`
- Columns: `book_id`, `title`, `author`, `category of book`, `price`, `stock`

The column `category of book` contains spaces. The server quotes all SQL identifiers with backticks, so it is handled safely. The project does **not** create or replace your existing `books` table.

## Setup on Windows / VS Code

1. Install Node.js LTS and ensure MySQL Server is running.
2. Open this project folder in VS Code.
3. In the terminal, install packages:

   ```bash
   npm install
   ```

4. Copy `.env.example` to a new file named `.env`.
5. In `.env`, set your actual MySQL password and confirm the database name is exact:

   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=YOUR_REAL_MYSQL_PASSWORD
   DB_NAME=books management system
   PORT=3000
   ```

   Do not add SQL quote marks around `DB_NAME`. If your actual schema is named differently, use the exact name from Workbench.

6. Start the app:

   ```bash
   npm start
   ```

7. Open <http://localhost:3000>.

## Pages

- `/` — Overview dashboard and recently added books
- `/insert` — Add a book (category and stock are dropdowns)
- `/list` — Full table, search and category filter
- `/update` — Choose an existing book from a dropdown; its values auto-fill
- `/delete` — Choose an existing book from a dropdown; review details and confirm
- `/listOne` — Choose an existing book from a dropdown and view its details

## Important

- Update and Delete use the selected `book_id` internally. You do not need to type an existing book's details.
- Delete requires a second confirmation.
- Real book/library photography is loaded from Unsplash URLs, so those background images need an internet connection.
- Book cover tiles are generated from the saved title and are not stored in MySQL.
- If you see an unknown column error, compare the exact column names in Workbench with `COLS` near the top of `server.js`. Keep your actual table unchanged; adjust the mapping in code instead.
- If the database name is different, change only `DB_NAME` in `.env`.
- Do not share your `.env` file or MySQL password.
