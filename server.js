
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DB_NAME = process.env.DB_NAME || "books management system";
const TABLE = "books";

const COLS = {
  id: "book_id",
  title: "title",
  author: "author",
  category: "category of book",
  price: "price",
  stock: "stock"
};

const q = (name) =>
  "`" + String(name).replace(/`/g, "``") + "`";

const qualifiedTable = `${q(DB_NAME)}.${q(TABLE)}`;
const qualifiedImagesTable = `${q(DB_NAME)}.${q("book_images")}`;

const selectColumns = Object.values(COLS).map(q).join(", ");

let pool;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.notice = req.query.notice || "";
  res.locals.error = req.query.error || "";
  next();
});

function page(res, view, extra = {}) {
  res.render(view, { ...extra });
}

function redirectNotice(res, url, notice) {
  res.redirect(
    `${url}?notice=${encodeURIComponent(notice)}`
  );
}

function redirectError(res, url, error) {
  res.redirect(
    `${url}?error=${encodeURIComponent(error)}`
  );
}

function bookFromRow(row) {
  return {
    book_id: row[COLS.id],
    title: row[COLS.title],
    author: row[COLS.author],
    category: row[COLS.category],
    price: row[COLS.price],
    stock: row[COLS.stock]
  };
}

async function allBooks(order = `${q(COLS.id)} DESC`) {
  const [rows] = await pool.query(
    `SELECT ${selectColumns}
     FROM ${qualifiedTable}
     ORDER BY ${order}`
  );

  return rows.map(bookFromRow);
}

async function getBook(id) {
  const [rows] = await pool.execute(
    `SELECT ${selectColumns}
     FROM ${qualifiedTable}
     WHERE ${q(COLS.id)} = ?
     LIMIT 1`,
    [id]
  );

  return rows.length ? bookFromRow(rows[0]) : null;
}

function cleanBook(body) {
  const title = String(body.title || "").trim();
  const author = String(body.author || "").trim();
  const category = String(body.category || "").trim();
  const price = Number(body.price);
  const stock = Number(body.stock);

  if (!title || !author || !category) {
    throw new Error(
      "Please fill in title, author and category."
    );
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(
      "Price must be a valid non-negative number."
    );
  }

  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error(
      "Stock must be a whole number (0 or more)."
    );
  }

  return { title, author, category, price, stock };
}

// HOME PAGE
app.get("/", async (req, res, next) => {
  try {
    const books = await allBooks();

    const totalStock = books.reduce(
      (sum, b) => sum + Number(b.stock || 0), 0
    );

    const totalValue = books.reduce(
      (sum, b) =>
        sum + Number(b.price || 0) * Number(b.stock || 0),
      0
    );

    const categories = [
      ...new Set(books.map(b => b.category).filter(Boolean))
    ];

    page(res, "index", {
      books: books.slice(0, 6),
      stats: {
        totalBooks: books.length,
        totalStock,
        totalValue,
        categories: categories.length
      }
    });
  } catch (e) {
    next(e);
  }
});

// INSERT BOOK
app.get("/insert", (req, res) => {
  page(res, "insert", { formBook: {} });
});

app.post("/insert", async (req, res, next) => {
  try {
    const b = cleanBook(req.body);

    await pool.execute(
      `INSERT INTO ${qualifiedTable}
       (${q(COLS.title)}, ${q(COLS.author)},
        ${q(COLS.category)}, ${q(COLS.price)},
        ${q(COLS.stock)})
       VALUES (?, ?, ?, ?, ?)`,
      [b.title, b.author, b.category, b.price, b.stock]
    );

    redirectNotice(res, "/list", "Book added successfully.");
  } catch (e) {
    if (e.message && !e.code) {
      return page(res, "insert", {
        formBook: req.body,
        error: e.message
      });
    }

    next(e);
  }
});

// LIST BOOKS
app.get("/list", async (req, res, next) => {
  try {
    let books = await allBooks();

    const categories = [
      ...new Set(books.map(b => b.category).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b));

    const category = String(req.query.category || "");
    const search = String(req.query.search || "")
      .trim()
      .toLowerCase();

    if (category) {
      books = books.filter(b => b.category === category);
    }

    if (search) {
      books = books.filter(b =>
        [
          b.title,
          b.author,
          b.category,
          String(b.book_id)
        ].some(v =>
          String(v || "").toLowerCase().includes(search)
        )
      );
    }

    page(res, "list", {
      books,
      categories,
      selectedCategory: category,
      search
    });
  } catch (e) {
    next(e);
  }
});

// VIEW ONE BOOK
app.get("/listOne", async (req, res, next) => {
  try {
    const books = await allBooks(`${q(COLS.title)} ASC`);
    const selectedId = String(req.query.id || "");
    const selected = selectedId
      ? await getBook(selectedId)
      : null;

    page(res, "listOne", {
      books,
      selected,
      selectedId
    });
  } catch (e) {
    next(e);
  }
});

// UPDATE BOOK PAGE
app.get("/update", async (req, res, next) => {
  try {
    const books = await allBooks(`${q(COLS.title)} ASC`);
    const selectedId = String(req.query.id || "");
    const selected = selectedId
      ? await getBook(selectedId)
      : null;

    page(res, "update", {
      books,
      selected,
      selectedId,
      formBook: selected || {}
    });
  } catch (e) {
    next(e);
  }
});

app.post("/update/select", (req, res) => {
  res.redirect(
    `/update?id=${encodeURIComponent(req.body.book_id || "")}`
  );
});

// UPDATE BOOK
app.post("/update", async (req, res, next) => {
  try {
    const id = String(req.body.book_id || "");

    if (!id) {
      return redirectError(res, "/update", "Choose a book first.");
    }

    const existing = await getBook(id);

    if (!existing) {
      return redirectError(
        res, "/update", "That book no longer exists."
      );
    }

    const b = cleanBook(req.body);

    await pool.execute(
      `UPDATE ${qualifiedTable}
       SET ${q(COLS.title)} = ?,
           ${q(COLS.author)} = ?,
           ${q(COLS.category)} = ?,
           ${q(COLS.price)} = ?,
           ${q(COLS.stock)} = ?
       WHERE ${q(COLS.id)} = ?`,
      [
        b.title, b.author, b.category,
        b.price, b.stock, id
      ]
    );

    redirectNotice(res, "/list", "Book updated successfully.");
  } catch (e) {
    if (e.message && !e.code) {
      const books = await allBooks(`${q(COLS.title)} ASC`);

      return page(res, "update", {
        books,
        selected: null,
        selectedId: String(req.body.book_id || ""),
        formBook: req.body,
        error: e.message
      });
    }

    next(e);
  }
});

// DELETE BOOK PAGE
app.get("/delete", async (req, res, next) => {
  try {
    const books = await allBooks(`${q(COLS.title)} ASC`);
    const selectedId = String(req.query.id || "");
    const selected = selectedId
      ? await getBook(selectedId)
      : null;

    page(res, "delete", {
      books,
      selected,
      selectedId
    });
  } catch (e) {
    next(e);
  }
});

app.post("/delete/select", (req, res) => {
  res.redirect(
    `/delete?id=${encodeURIComponent(req.body.book_id || "")}`
  );
});

// DELETE BOOK — FIXED FOREIGN KEY ERROR
app.post("/delete", async (req, res, next) => {
  let conn;

  try {
    const id = String(req.body.book_id || "");

    if (!id) {
      return redirectError(
        res, "/delete", "Choose a book from the dropdown."
      );
    }

    const book = await getBook(id);

    if (!book) {
      return redirectError(
        res, "/delete", "That book was not found."
      );
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // First delete related image records.
    await conn.execute(
      `DELETE FROM ${qualifiedImagesTable}
       WHERE ${q("book_id")} = ?`,
      [id]
    );

    // Then delete the book record.
    await conn.execute(
      `DELETE FROM ${qualifiedTable}
       WHERE ${q(COLS.id)} = ?`,
      [id]
    );

    await conn.commit();

    redirectNotice(
      res,
      "/delete",
      `Deleted "${book.title}" successfully.`
    );
  } catch (e) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    next(e);
  } finally {
    if (conn) conn.release();
  }
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);

  let message = "Something went wrong while accessing MySQL.";

  if (err.code === "ER_NO_SUCH_TABLE") {
    message = `A required table was not found in "${DB_NAME}".`;
  } else if (err.code === "ER_BAD_FIELD_ERROR") {
    message = "A column name does not match your MySQL table.";
  } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
    message = "MySQL login failed. Check your .env credentials.";
  } else if (err.code === "ECONNREFUSED") {
    message = "MySQL is not running or DB_HOST/DB_PORT is incorrect.";
  } else if (err.code === "ER_BAD_DB_ERROR") {
    message = `Database "${DB_NAME}" was not found.`;
  } else if (err.code === "ER_ROW_IS_REFERENCED_2") {
    message =
      "This book is referenced by another table. Delete related records first.";
  }

  res.status(500).render("error", {
    message,
    details:
      process.env.NODE_ENV === "development" ? err.message : "",
    currentPath: req.path,
    notice: "",
    error: ""
  });
});

// START SERVER
async function start() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true
  });

  const conn = await pool.getConnection();

  try {
    await conn.query(`SELECT 1 FROM ${qualifiedTable} LIMIT 1`);
    await conn.query(`SELECT 1 FROM ${qualifiedImagesTable} LIMIT 1`);
  } finally {
    conn.release();
  }

  app.listen(PORT, () => {
    console.log(
      `\nZainab Books Management System running at http://localhost:${PORT}`
    );
    console.log(`Connected to MySQL database: ${DB_NAME}`);
    console.log(`Using table: ${TABLE}\n`);
  });
}

start().catch(err => {
  console.error("\nCould not start the website.");
  console.error(err.message);

  if (pool) {
    pool.end().catch(console.error);
  }

  process.exit(1);
});
