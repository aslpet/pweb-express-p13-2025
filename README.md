# IT Literature Shop - Backend API

> Backend API untuk sistem toko buku online IT Literature Shop menggunakan Express.js, TypeScript, PostgreSQL, dan Prisma ORM.

## Tech Stack
- **Express.js** - Web framework
- **TypeScript** - Programming language
- **PostgreSQL** (Neon) - Database
- **Prisma ORM** - Database ORM
- **JWT** - Authentication

## 📚 Development Guide

### Code Structure
```
src/
├── controllers/     # Business logic
├── middlewares/     # Auth, validation, etc
├── routes/          # Route definitions
├── types/           # TypeScript interfaces
└── utils/           # Helper functions
    ├── prisma.ts        # Prisma client
    ├── response.ts      # Response helpers
    └── pagination.ts    # Pagination helpers

    bisa nambah ntar update sendiri ye
```

## Setup Instructions

### 1. Clone Repository
```
//bash
git clone https://github.com/YOUR_USERNAME/pweb-express-p13-2025.git
cd pweb-express-p13-2025
```

### 2. Install Dependencies
```
//bash
npm install
```

### 3. Setup Environment Variables
Buat file \`.env\` di root folder:
```
//env
DATABASE_URL="your_neon_database_url"
JWT_SECRET="your-secret-key-min-32-characters"
PORT=3000
```

### 4. Setup Database
```
//bash
npx prisma migrate dev
npx prisma generate
```

### 5. Run Development Server
```
//bash
npm run dev
```

Server akan berjalan di `http://localhost:3000\`

## API Endpoints

### Authentication
- **POST** \`/auth/register\` - Register user baru
- **POST** \`/auth/login\` - Login user
- **GET** \`/auth/me\` - Get user profile (Protected)

### Genre (TODO - Anggota 2)
- **POST** \`/genre\` - Create genre
- **GET** \`/genre\` - Get all genres
- **GET** \`/genre/:id\` - Get genre detail
- **PATCH** \`/genre/:id\` - Update genre
- **DELETE** \`/genre/:id\` - Delete genre

### Books (TODO - Anggota 2)
- **POST** \`/books\` - Create book
- **GET** \`/books\` - Get all books (with filter & pagination)
- **GET** \`/books/:id\` - Get book detail
- **GET** \`/books/genre/:genre_id\` - Get books by genre
- **PATCH** \`/books/:id\` - Update book
- **DELETE** \`/books/:id\` - Delete book

### Transactions (TODO - Anggota 3)
- **POST** \`/transactions\` - Create transaction
- **GET** \`/transactions\` - Get all transactions
- **GET** \`/transactions/:id\` - Get transaction detail
- **GET** \`/transactions/statistics\` - Get statistics

## Team Members
- **Anggota 1**: Setup & Authentication ✅
- **Anggota 2**: Genre & Books Module
- **Anggota 3**: Transactions & Statistics

## Development Workflow
1. Pull latest changes: \`git pull origin main\`
2. Create feature branch: \`git checkout -b feature/your-feature\`
3. Make changes & commit: \`git commit -m "feat: your feature"\`
4. Push branch: \`git push origin feature/your-feature\`
5. Create Pull Request di GitHub
6. Code review & merge

## Demo Preparation
- Pastikan semua endpoint berjalan
- Test dengan Postman collection
- Setiap anggota harus bisa explain seluruh kode

---

### Step 7.2: Buat `.env.example`

Buat file `.env.example`:
```env
# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# JWT Secret (min 32 characters)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server Port
PORT=3000
```

### Helper Functions

#### ResponseHelper
```
\`\`\`typescript
// Success response
return ResponseHelper.success(res, data, 'Success message', 200);

// Error response
return ResponseHelper.error(res, 'Error message', 400);

// Paginated response
return ResponseHelper.paginated(res, data, meta, 200);
\`\`\`
```

#### PaginationHelper
```
\\typescript
// Get pagination params from query
const { page, limit, skip } = PaginationHelper.getPaginationParams(req.query);

// Create pagination meta
const meta = PaginationHelper.createMeta(page, limit, total);
```
---

## Demo Preparation
- Pastikan semua endpoint berjalan
- Test dengan Postman collection
- Setiap anggota harus bisa explain seluruh kode

---

### Testing Checklist
- [ ] Test dengan data valid
- [ ] Test dengan data invalid (error cases)
- [ ] Test dengan missing fields
- [ ] Test dengan non-existent IDs
- [ ] Test pagination (jika applicable)
- [ ] Test filter (jika applicable)
\`\`\`

---