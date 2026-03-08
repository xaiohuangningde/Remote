# Examples

[← Advanced Usage](ADVANCED-USAGE.md) | [Main](SKILL.md)

---

## 📋 Output Format Example

The TODO.md file follows a structured template with task breakdown, user answers, and reference documentation. Tasks are categorized by readiness status (✅ Ready, ⏳ Pending, 🔍 Research, 🚧 Blocked) with hierarchical checkboxes, time estimates, and dependencies.

**Complete Template with Examples**: See `/todo-output-template` skill or `plugins/cccp/skills/todo-output-template/SKILL.md`

**Key Sections**:
- **Execution Summary**: Research performance, technical analysis, duplicate checks, memory file references
- **Task List**: Phase-based breakdown with status indicators, file locations, implementation hints
- **Questions**: Checklist format with research rationale and current status

---

## Example 1: Basic Feature Implementation

### Scenario
You want to implement a new authentication feature for a web application.

### Initial Request
```
I need to add JWT-based authentication to my Express.js API. Users should be able to register, login, and access protected routes.
```

### Command Usage
```bash
/todo-task-planning "Implement JWT authentication for Express.js API with user registration, login, and protected routes"
```

### Expected Output Structure
```markdown
# Task Plan: JWT Authentication Implementation

## 📋 Execution Summary
- Research queries: 5 executed
- Files analyzed: 3 (package.json, server.js, routes/index.js)
- Duplicates checked: 2 (auth middleware, user model)
- Memory files: 1 (authentication-patterns.md)

## ✅ Tasks Ready for Execution

### Phase 1: Setup (30-45 min)
- [ ] Install dependencies (jsonwebtoken, bcrypt) - 5 min
- [ ] Create user model schema - 10 min
- [ ] Setup database connection - 15 min

### Phase 2: Authentication Logic (60-90 min)
- [ ] Implement user registration endpoint - 30 min
- [ ] Implement login endpoint with token generation - 30 min
- [ ] Create JWT verification middleware - 20 min

### Phase 3: Protected Routes (30 min)
- [ ] Apply middleware to protected routes - 15 min
- [ ] Add token refresh logic - 15 min

## 🤔 Questions for User
- [ ] Which database will you use? (MongoDB, PostgreSQL, MySQL)
- [ ] What should the token expiration time be? (e.g., 1h, 24h)
- [ ] Do you need role-based access control?
```

---

## Example 2: Complex Multi-Phase Project

### Scenario
Building a full-stack e-commerce platform with multiple interconnected features.

### Initial Request
```
Create a comprehensive e-commerce platform with product catalog, shopping cart, checkout process, and admin panel. Include payment integration and order tracking.
```

### Command Usage with Options
```bash
/todo-task-planning "Build e-commerce platform with product catalog, cart, checkout, payment, and admin panel" --create-branch --create-pr
```

### Expected Output Structure
```markdown
# Task Plan: E-commerce Platform Development

## 📋 Execution Summary
- Research queries: 15 executed
- Files analyzed: 12 (existing components, API structure)
- Duplicates checked: 5 (cart logic, payment handlers)
- Memory files: 3 (e-commerce-patterns.md, payment-security.md, admin-best-practices.md)

## ⏳ Pending Tasks (Dependencies Required)

### Phase 1: Database & Models (2-3 hours)
- [ ] Design database schema (products, users, orders, cart) - 60 min
- [ ] Create Sequelize/Prisma models - 45 min
- [ ] Setup migrations - 30 min

### Phase 2: Product Catalog (3-4 hours)
- [ ] Product listing API with pagination - 60 min
- [ ] Product search and filtering - 90 min
- [ ] Category management - 45 min

### Phase 3: Shopping Cart (2-3 hours)
- [ ] Cart state management (Redux/Context) - 60 min
- [ ] Add/remove/update cart items - 45 min
- [ ] Cart persistence (localStorage + DB) - 30 min

### Phase 4: Checkout Process (4-5 hours)
- [ ] Shipping address form - 45 min
- [ ] Payment integration (Stripe/PayPal) - 120 min
- [ ] Order confirmation and email - 60 min

### Phase 5: Admin Panel (5-6 hours)
- [ ] Admin authentication and authorization - 90 min
- [ ] Product CRUD operations - 120 min
- [ ] Order management dashboard - 120 min

### Phase 6: Testing & Deployment (3-4 hours)
- [ ] Unit tests for critical functions - 90 min
- [ ] Integration tests for API - 90 min
- [ ] Deployment configuration - 60 min

## 🤔 Questions for User
- [ ] Which payment provider do you prefer? (Stripe, PayPal, Square)
- [ ] What frontend framework? (React, Vue, Next.js)
- [ ] What authentication method for admin? (JWT, Session-based, OAuth)
- [ ] Do you need inventory management?
- [ ] What hosting platform? (Vercel, AWS, Heroku)

## 🔍 Research Tasks
- [ ] Research best practices for PCI compliance
- [ ] Investigate cart abandonment prevention strategies
- [ ] Review e-commerce security checklist

## 📚 Reference Documentation
- Stripe API Documentation
- E-commerce checkout flow patterns
- Admin dashboard UI/UX best practices
```

---

## Example 3: Iterative Execution with Updated Requirements

### Scenario
Initial plan created, but requirements changed after discussion with stakeholders.

### Initial Command
```bash
/todo-task-planning "Add user profile page with avatar upload"
```

### Updated Requirements After Feedback
After stakeholder meeting, requirements expanded to include:
- Bio and social links
- Privacy settings
- Activity history

### Updated Command
```bash
/todo-task-planning "Add comprehensive user profile with avatar upload, bio, social links, privacy settings, and activity history"
```

### Expected Output Structure
```markdown
# Task Plan: Comprehensive User Profile (Updated)

## 📋 Execution Summary
- Research queries: 8 executed (4 new)
- Files analyzed: 5 (UserProfile.jsx, ProfileAPI.js, settings.js added)
- Duplicates checked: 3 (avatar upload exists, reuse logic)
- Memory files: 2 (profile-patterns.md, privacy-settings-guide.md)
- **Update Notes**: Extended original plan with privacy and activity features

## ✅ Tasks Ready for Execution

### Phase 1: Core Profile (COMPLETED - from previous iteration)
- [x] Create profile page component - 30 min
- [x] Implement avatar upload with S3 - 45 min

### Phase 2: Extended Profile Information (NEW - 90 min)
- [ ] Add bio text editor (max 500 chars) - 20 min
- [ ] Add social links fields (Twitter, LinkedIn, GitHub) - 30 min
- [ ] Profile preview component - 20 min

### Phase 3: Privacy Settings (NEW - 120 min)
- [ ] Create privacy settings page - 45 min
- [ ] Implement visibility controls (public/friends/private) - 45 min
- [ ] Apply privacy filters to profile API - 30 min

### Phase 4: Activity History (NEW - 90 min)
- [ ] Design activity feed schema - 20 min
- [ ] Implement activity logging middleware - 40 min
- [ ] Create activity timeline component - 30 min

## 🤔 Questions for User
- [ ] Should activity history be filterable? (by date, type)
- [ ] What social platforms to support beyond the basic three?
- [ ] Should users be able to export their data? (GDPR compliance)

## 🔧 Technical Decisions Made
- Reusing existing avatar upload logic from Phase 1
- Privacy settings stored in separate table for performance
- Activity history limited to last 90 days in UI (archived after)
```

---

[← Advanced Usage](ADVANCED-USAGE.md) | [Main](SKILL.md)
