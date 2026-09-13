# Graph Report - .  (2026-08-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1599 nodes · 3911 edges · 147 communities (76 shown, 71 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6459ace2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- svelte.ts
- validators/index.ts
- forms.ts
- handlers/students.ts
- handlers/grades.ts
- handlers/teacherConfirmations.ts
- handlers/journals.ts
- App.ts
- core/index.ts
- queries/users.ts
- handlers/schoolLocations.ts
- handlers/index.ts
- queries/roles.ts
- middlewares/index.ts
- CacheStore.ts
- gen-resource.ts
- queries/index.ts
- handlers/headmaster.ts
- handlers/teachers.ts
- scripts
- compilerOptions
- handlers/academicYears.ts
- handlers/schedules.ts
- handlers/classes.ts
- NaraRouter
- Storage.ts
- devDependencies
- eval-agent.ts
- handlers/users.ts
- codemap.ts
- web.ts
- Logger.ts
- handlers/subjects.ts
- paths
- check-types.ts
- handlers/announcements.ts
- SQLite.ts
- mocks.ts
- isAdmin
- LoginThrottle.ts
- Migrator.ts
- NaraResponse
- permissions.ts
- handlers/assets.ts
- teacherAssignments.ts
- notifications.test.ts
- check-filesize.ts
- middlewares/csrf.ts
- gradeAudit.test.ts
- SQLite
- dependencies
- check-agents.ts
- check-links.ts
- package.json
- include
- check-security.ts
- lint-layers.ts
- 05_demo_operations.ts
- check-freshness.ts
- stats.ts
- lib/csrf.ts
- 07_demo_data.ts
- vite.config.mjs
- 20260820000003_rename_user_email_to_username.ts
- exclude
- home.ts
- 20230513055909_users.ts
- 20230514062913_sessions.ts
- 20250110233301_assets.ts
- 20260214120000_create_roles.ts
- 20260214120001_create_permissions.ts
- 20260214120002_create_role_permissions.ts
- 20260214120003_create_user_roles.ts
- 20260728000000_update_users_for_sigap.ts
- 20260728000001_create_academic_years.ts
- 20260728000002_create_classes.ts
- 20260728000003_create_subjects.ts
- 20260728000004_create_students.ts
- 20260728000005_create_teachers.ts
- 20260728000006_create_parents.ts
- 20260728000007_create_teacher_subjects.ts
- 20260728000008_create_class_subjects.ts
- 20260728000009_create_schedules.ts
- 20260728000010_create_school_locations.ts
- 20260728000011_create_teacher_confirmations.ts
- 20260728000012_create_journals.ts
- 20260728000013_create_student_attendance.ts
- 20260728000014_create_grades.ts
- 20260816000001_add_kkm_to_subjects.ts
- 20260816000002_create_grade_components.ts
- 20260816000003_add_grades_published_to_academic_years.ts
- 20260816000004_create_grade_audit_logs.ts
- 20260816000005_create_announcements.ts
- 20260816000006_create_notifications.ts
- 20260820000001_create_teacher_class_assignments.ts
- 20260820000004_school_profile_for_qr_flow.ts
- 20260820000005_create_app_settings.ts
- 20260820000006_teacher_confirmations_for_qr.ts
- 20260830000002_one_daily_teacher_confirmation.ts
- @config/*
- @core
- @queries
- @types
- $lib
- dev.ts
- 06_grade_components.ts
- conventions.test.ts
- clsx
- compression
- cookie-parser
- cors
- dotenv
- @inertiajs/svelte
- @lucide/svelte
- mode-watcher
- multer
- axios
- pino
- pino-pretty
- pino-roll
- qrcode
- sharp
- svelte-sonner
- tailwind-merge
- tailwind-variants
- tailwindcss
- @types/qrcode
- ultimate-express
- @zag-js/pagination
- @zag-js/svelte
- @zag-js/switch
- @zag-js/tabs
- zod
- @sveltejs/vite-plugin-svelte
- tsc-alias
- @types/better-sqlite3
- @types/multer
- @types/node
- @vitest/coverage-v8
- theme.ts
- pre-commit

## God Nodes (most connected - your core abstractions)
1. `isAdmin()` - 112 edges
2. `hasPermission()` - 89 edges
3. `zodToErrors()` - 54 edges
4. `scripts` - 25 edges
5. `compilerOptions` - 23 edges
6. `NaraResponse` - 21 edges
7. `mockResponse()` - 21 edges
8. `findScheduleById` - 21 edges
9. `createApp()` - 20 edges
10. `NaraRequest` - 20 edges

## Surprising Connections (you probably didn't know these)
- `run()` --calls--> `hashPassword()`  [EXTRACTED]
  seeds/03_admin.ts → app/services/Authenticate.ts
- `run()` --calls--> `hashPassword()`  [EXTRACTED]
  seeds/04_demo.ts → app/services/Authenticate.ts
- `run()` --calls--> `hashPassword()`  [EXTRACTED]
  seeds/07_demo_data.ts → app/services/Authenticate.ts
- `makeStore()` --calls--> `createCacheStore()`  [EXTRACTED]
  tests/services/CacheStore.test.ts → app/services/CacheStore.ts
- `up()` --indirect_call--> `permissionSlug()`  [INFERRED]
  migrations/20260830000001_align_operator_roles.ts → resources/lib/permissions.ts

## Import Cycles
- 3-file cycle: `app/core/adapters/svelte.ts -> app/middlewares/renderer.ts -> app/core/index.ts -> app/core/adapters/svelte.ts`
- 3-file cycle: `app/core/App.ts -> app/middlewares/rateLimit.ts -> app/core/index.ts -> app/core/App.ts`
- 3-file cycle: `app/core/App.ts -> app/middlewares/csrf.ts -> app/core/index.ts -> app/core/App.ts`
- 3-file cycle: `app/core/App.ts -> app/middlewares/inputSanitize.ts -> app/core/index.ts -> app/core/App.ts`

## Communities (147 total, 71 thin omitted)

### Community 0 - "svelte.ts"
Cohesion: 0.07
Nodes (11): error(), api(), ApiOptions, ApiResponse, formatValidationErrors(), Toast(), ToastType, cn() (+3 more)

### Community 1 - "validators/index.ts"
Cohesion: 0.06
Nodes (71): AcademicYearInput, AcademicYearSchema, AnnouncementInput, AnnouncementSchema, ChangePasswordInput, ChangePasswordSchema, ChangeProfileInput, ChangeProfileSchema (+63 more)

### Community 2 - "forms.ts"
Cohesion: 0.04
Nodes (43): AcademicYear, AnnouncementView, ApiErrorResponse, ApiResponse, ApiSuccessResponse, AppSetting, Class, Grade (+35 more)

### Community 3 - "handlers/students.ts"
Cohesion: 0.07
Nodes (54): childAttendanceData(), parentDashboardData(), parentGradesPage(), addParent(), canManage(), canView(), listParents(), parentByUser() (+46 more)

### Community 4 - "handlers/grades.ts"
Cohesion: 0.09
Nodes (49): addGrade(), canManageGradeInClass(), canView(), canViewTeacherGrade(), confirmationRequired(), editGrade(), gradeData(), gradesByStudent() (+41 more)

### Community 5 - "handlers/teacherConfirmations.ts"
Cohesion: 0.09
Nodes (42): canView(), confirmPage(), isTeacherActor(), listTeacherConfirmations(), outsideConfirmationsData(), submitTeacherConfirmation(), teacherConfirmationData(), teacherConfirmationsPage() (+34 more)

### Community 6 - "handlers/journals.ts"
Cohesion: 0.13
Nodes (36): addJournal(), canManage(), canView(), editJournal(), isTeacherActor(), journalData(), journalsPage(), listJournals() (+28 more)

### Community 7 - "App.ts"
Cohesion: 0.11
Nodes (23): AUTH, CACHE, LOGGING, QR, RATE_LIMIT, SERVER, UPLOAD, checkFeatureConfig() (+15 more)

### Community 8 - "core/index.ts"
Cohesion: 0.17
Nodes (28): authError(), badRequestError(), conflictError(), forbiddenError(), httpError(), internalError(), isUniqueConstraintError(), NaraError (+20 more)

### Community 9 - "queries/users.ts"
Cohesion: 0.08
Nodes (21): findAssetsByUserId, getUserBySessionId(), getUserPermissions, getUserRoles, hasRole(), AcademicYear, Announcement, Asset (+13 more)

### Community 10 - "handlers/schoolLocations.ts"
Cohesion: 0.14
Nodes (26): QR_REFRESH_INTERVAL_DEFAULT, canManage(), qrCodeData(), qrDisplayPage(), qrSettingsPage(), saveQrSettings(), activateSchoolLocation(), activeSchoolLocationData() (+18 more)

### Community 11 - "handlers/index.ts"
Cohesion: 0.07
Nodes (29): academicYears, announcements, assets, attendance, auth, classes, dashboard, gradeAudit (+21 more)

### Community 12 - "queries/roles.ts"
Cohesion: 0.17
Nodes (20): addRole(), editRole(), listRoles(), permissionsData(), removeRole(), rolesPage(), createRole(), deleteRole() (+12 more)

### Community 13 - "middlewares/index.ts"
Cohesion: 0.14
Nodes (22): NaraMiddleware, NaraRequest, CSRFOptions, inputSanitize(), sanitizeValue(), stripHtml(), stripTags(), RateLimitOptions (+14 more)

### Community 14 - "CacheStore.ts"
Cohesion: 0.12
Nodes (14): renderer(), assetCache, CacheEntry, CacheStats, CacheStore, CacheStoreOptions, createCacheStore(), templateCache (+6 more)

### Community 15 - "gen-resource.ts"
Cohesion: 0.21
Nodes (25): ADR-0001, ADR-0002, ADR-0009, appendToFile(), capitalize(), Field, generateHandlers(), generateInterface() (+17 more)

### Community 16 - "queries/index.ts"
Cohesion: 0.18
Nodes (15): changePassword(), submitLogin(), createSession(), deleteSession(), deleteSessionsByUserId(), findUserByUsername, updatePassword(), comparePassword() (+7 more)

### Community 17 - "handlers/headmaster.ts"
Cohesion: 0.15
Nodes (23): headmasterDashboardData(), headmasterDashboardPage(), headmasterReportsPage(), isHeadmaster(), listOutsideConfirmations(), findActiveYearSchedules, getGradeProgress, getJournalCompleteness() (+15 more)

### Community 18 - "handlers/teachers.ts"
Cohesion: 0.17
Nodes (22): addTeacher(), assignTeacherSubjects(), canManage(), canView(), listTeachers(), removeTeacher(), teacherByUser(), teacherData() (+14 more)

### Community 19 - "scripts"
Cohesion: 0.08
Nodes (25): scripts, build, check, check:agents, check:filesize, check:freshness, check:links, check:security (+17 more)

### Community 20 - "compilerOptions"
Cohesion: 0.09
Nodes (23): es2021, compilerOptions, allowSyntheticDefaultImports, baseUrl, esModuleInterop, lib, module, moduleResolution (+15 more)

### Community 21 - "handlers/academicYears.ts"
Cohesion: 0.22
Nodes (19): academicYearsPage(), activateAcademicYear(), activeAcademicYearData(), addAcademicYear(), canManage(), canView(), gradeComponentsData(), listAcademicYears() (+11 more)

### Community 22 - "handlers/schedules.ts"
Cohesion: 0.22
Nodes (19): addSchedule(), canManage(), canView(), isTeacherActor(), listSchedules(), removeSchedule(), scheduleData(), schedulesPage() (+11 more)

### Community 23 - "handlers/classes.ts"
Cohesion: 0.21
Nodes (18): addClass(), canManage(), canView(), classData(), classesPage(), listClasses(), removeClass(), ClassWithHomeroom (+10 more)

### Community 24 - "NaraRouter"
Cohesion: 0.22
Nodes (7): createRouter(), HttpMethod, NaraRouter, RouteArgs, NaraHandler, RouteMiddlewares, getInternalRouter()

### Community 25 - "Storage.ts"
Cohesion: 0.15
Nodes (13): CameraUploadResult, config, del(), exists(), filePath(), get(), getBasePath(), put() (+5 more)

### Community 26 - "devDependencies"
Cohesion: 0.11
Nodes (19): nodemon, devDependencies, nodemon, svelte, tsconfig-paths, @types/compression, @types/cookie-parser, @types/cors (+11 more)

### Community 27 - "eval-agent.ts"
Cohesion: 0.18
Nodes (18): APPENDED_FILES, CREATED_FILES, EvalResult, fileContains(), fileExists(), main(), record(), reportAndExit() (+10 more)

### Community 28 - "handlers/users.ts"
Cohesion: 0.24
Nodes (15): addUser(), changeProfile(), dashboardPage(), removeUsers(), usersPage(), findRoleBySlug, getUsersWithRole, findStudentsForParentSelect (+7 more)

### Community 29 - "codemap.ts"
Cohesion: 0.16
Nodes (16): collectAdrs(), ENTRY_FILES, ExportEntry, extractExports(), extractImports(), FileEntry, formatAdrIndex(), formatImportGraph() (+8 more)

### Community 30 - "web.ts"
Cohesion: 0.20
Nodes (13): svelteAdapter(), apiRateLimit(), getRequestCount(), getResetTime(), rateLimit(), RateLimitEntry, recordRequest(), resetRateLimit() (+5 more)

### Community 31 - "Logger.ts"
Cohesion: 0.15
Nodes (12): child(), debug(), info(), logAuth(), logger, logQuery(), logRequest(), logsDir (+4 more)

### Community 32 - "handlers/subjects.ts"
Cohesion: 0.28
Nodes (14): addSubject(), canManage(), canView(), editSubject(), listSubjects(), removeSubject(), subjectData(), subjectsPage() (+6 more)

### Community 33 - "paths"
Cohesion: 0.12
Nodes (16): ./*, app/handlers/*, app/handlers/index.ts, app/middlewares/*, app/services/*, app/services/index.ts, app/validators/*, app/validators/index.ts (+8 more)

### Community 34 - "check-types.ts"
Cohesion: 0.17
Nodes (15): ANY_PATTERNS, BASELINE_FILE, collectFiles(), countAny(), getCurrentCounts(), loadBaseline(), main(), ROOT (+7 more)

### Community 35 - "handlers/announcements.ts"
Cohesion: 0.35
Nodes (12): addAnnouncement(), announcementsPage(), editAnnouncement(), latestAnnouncementsData(), listAnnouncements(), removeAnnouncement(), createAnnouncement(), deleteAnnouncement() (+4 more)

### Community 36 - "SQLite.ts"
Cohesion: 0.13
Nodes (3): nativeDb, prodEnvPath, statementCache

### Community 37 - "mocks.ts"
Cohesion: 0.27
Nodes (8): validBody, createdConfirmation, teacher, validBody, mockRequest(), mockResponse(), mockUser(), runMiddleware()

### Community 38 - "isAdmin"
Cohesion: 0.32
Nodes (13): editAcademicYear(), attendanceReportData(), editClass(), editParent(), editSchedule(), editSchoolLocation(), editStudent(), removeStudent() (+5 more)

### Community 39 - "LoginThrottle.ts"
Cohesion: 0.16
Nodes (7): cleanup, config, Entry, getEntry(), recordFailedAttempt(), resetIfExpired(), store

### Community 40 - "Migrator.ts"
Cohesion: 0.25
Nodes (12): appliedMigrations(), ensureMigrationsTable(), execStep(), listMigrationFiles(), loadMigration(), migrate(), migrateFresh(), migrateRollback() (+4 more)

### Community 41 - "NaraResponse"
Cohesion: 0.21
Nodes (7): AdapterMiddlewareHandler, FrontendAdapter, AppOptions, AuthUser, NaraResponse, RouteCallback, User

### Community 42 - "permissions.ts"
Cohesion: 0.20
Nodes (10): revokedPermissions, RolePermissionUpdate, roleUpdates, up(), can(), currentUserPermissions, hasPermission(), PermissionAction (+2 more)

### Community 43 - "handlers/assets.ts"
Cohesion: 0.27
Nodes (7): avatarMiddleware, avatarUpload, IMAGE_MAGIC_BYTES, uploadAsset(), validateMagicBytes(), createAsset(), updateAvatar()

### Community 44 - "teacherAssignments.ts"
Cohesion: 0.36
Nodes (8): dashboardPage(), canManage(), saveTeacherAssignments(), teacherAssignmentsPage(), findActiveAcademicYear, findTeacherClassAssignmentsByAcademicYear, syncTeacherClassAssignments(), findAllTeachersForAssignment

### Community 45 - "notifications.test.ts"
Cohesion: 0.47
Nodes (7): markNotificationsRead(), notificationsData(), createGradePublishedNotifications(), findNotificationsByUser, getUnreadNotificationCount(), markAllNotificationsRead(), NotificationView

### Community 46 - "check-filesize.ts"
Cohesion: 0.24
Nodes (9): CHECK_DIRS, CHECK_EXT, CHECK_FILES, countLines(), main(), ROOT, Violation, walk() (+1 more)

### Community 47 - "middlewares/csrf.ts"
Cohesion: 0.44
Nodes (7): jsonForbidden(), buildCookieOptions(), csrf(), csrfToken(), ensureToken(), getCSRFToken(), SAFE_METHODS

### Community 48 - "gradeAudit.test.ts"
Cohesion: 0.47
Nodes (6): canViewAudit(), gradeAuditData(), gradeAuditPage(), getGradeAuditLogsPaginated(), GradeAuditLogRow, logRow

### Community 49 - "SQLite"
Cohesion: 0.31
Nodes (6): listSeedFiles(), loadSeed(), Seed, SEEDS_DIR, SQLite, result

### Community 50 - "dependencies"
Cohesion: 0.22
Nodes (9): better-sqlite3, dependencies, better-sqlite3, @tailwindcss/vite, @zag-js/dialog, @zag-js/menu, @tailwindcss/vite, @zag-js/dialog (+1 more)

### Community 51 - "check-agents.ts"
Cohesion: 0.31
Nodes (8): Check, checkOne(), CHECKS, extractMentionedFiles(), listDirFiles(), main(), ROOT, Violation

### Community 52 - "check-links.ts"
Cohesion: 0.25
Nodes (5): BrokenLink, checkFile(), main(), ROOT, SCAN_FILES

### Community 53 - "package.json"
Cohesion: 0.25
Nodes (7): author, description, license, main, name, private, version

### Community 54 - "include"
Cohesion: 0.25
Nodes (8): app, migrations, routes/*, scripts, seeds, ./*.ts, include, @routes/*

### Community 55 - "check-security.ts"
Cohesion: 0.32
Nodes (7): checkFile(), main(), ROOT, SKIP_DIRS, Violation, violations, walk()

### Community 56 - "lint-layers.ts"
Cohesion: 0.32
Nodes (7): checkFile(), main(), ROOT, SKIP_DIRS, Violation, violations, walk()

### Community 57 - "05_demo_operations.ts"
Cohesion: 0.25
Nodes (6): ClassRow, MATERIALS, STATUS_CYCLE, StudentRow, SubjectRow, TeacherRow

### Community 58 - "check-freshness.ts"
Cohesion: 0.33
Nodes (6): CODEMAP, main(), ROOT, TRACKED_DIRS, TRACKED_EXT, walk()

### Community 59 - "stats.ts"
Cohesion: 0.47
Nodes (4): classSubjectReport(), ClassSubjectStats, DashboardStats, getClassSubjectStats()

### Community 61 - "07_demo_data.ts"
Cohesion: 0.40
Nodes (5): MATERIALS, occurrencesBetween(), run(), ScheduleRow, STATUS_CYCLE

### Community 62 - "vite.config.mjs"
Cohesion: 0.33
Nodes (4): __dirname, __filename, files, input

### Community 63 - "20260820000003_rename_user_email_to_username.ts"
Cohesion: 0.50
Nodes (3): normalizeUsername(), up(), UserRow

### Community 64 - "exclude"
Cohesion: 0.40
Nodes (4): build, dist, node_modules, exclude

### Community 65 - "home.ts"
Cohesion: 0.83
Nodes (3): landingPage(), findSessionById, findUserById

### Community 99 - "@config/*"
Cohesion: 0.67
Nodes (3): app/config/*, app/config/index.ts, @config/*

### Community 100 - "@core"
Cohesion: 0.67
Nodes (3): app/core/*, app/core/index.ts, @core

### Community 101 - "@queries"
Cohesion: 0.67
Nodes (3): app/queries/*, app/queries/index.ts, @queries

### Community 102 - "@types"
Cohesion: 0.67
Nodes (3): app/types/*, app/types/models.ts, @types

### Community 103 - "$lib"
Cohesion: 0.67
Nodes (3): resources/lib/*, resources/lib/index.ts, $lib

## Knowledge Gaps
- **405 isolated node(s):** `projectRoot`, `prodEnvPath`, `EnvSchema`, `parsed`, `DEFAULT_OPTIONS` (+400 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `isAdmin()` connect `isAdmin` to `svelte.ts`, `handlers/students.ts`, `handlers/grades.ts`, `handlers/teacherConfirmations.ts`, `handlers/journals.ts`, `queries/users.ts`, `handlers/schoolLocations.ts`, `queries/roles.ts`, `handlers/teachers.ts`, `handlers/academicYears.ts`, `handlers/schedules.ts`, `handlers/classes.ts`, `handlers/users.ts`, `handlers/subjects.ts`, `handlers/announcements.ts`, `mocks.ts`, `teacherAssignments.ts`, `notifications.test.ts`, `gradeAudit.test.ts`, `stats.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `hasPermission()` connect `isAdmin` to `handlers/subjects.ts`, `handlers/students.ts`, `handlers/grades.ts`, `handlers/teacherConfirmations.ts`, `handlers/journals.ts`, `queries/users.ts`, `handlers/schoolLocations.ts`, `teacherAssignments.ts`, `queries/roles.ts`, `gradeAudit.test.ts`, `handlers/headmaster.ts`, `handlers/teachers.ts`, `handlers/academicYears.ts`, `handlers/schedules.ts`, `handlers/classes.ts`, `stats.ts`, `handlers/users.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `projectRoot`, `prodEnvPath`, `EnvSchema` to the rest of the system?**
  _405 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `svelte.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07191919191919192 - nodes in this community are weakly interconnected._
- **Should `validators/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055534987041836355 - nodes in this community are weakly interconnected._
- **Should `forms.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03903420523138833 - nodes in this community are weakly interconnected._
- **Should `handlers/students.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06935908691834942 - nodes in this community are weakly interconnected._