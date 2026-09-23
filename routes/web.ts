import { createRouter } from '@core';
import * as home from '@handlers/home';
import * as auth from '@handlers/auth';
import * as users from '@handlers/users';
import * as roles from '@handlers/roles';
import * as assets from '@handlers/assets';
import * as dashboard from '@handlers/dashboard';
import * as academicYears from '@handlers/academicYears';
import * as classes from '@handlers/classes';
import * as subjects from '@handlers/subjects';
import * as students from '@handlers/students';
import * as teachers from '@handlers/teachers';
import * as teacherAssignments from '@handlers/teacherAssignments';
import * as parents from '@handlers/parents';
import * as schedules from '@handlers/schedules';
import * as schoolLocations from '@handlers/schoolLocations';
import * as schoolCalendar from '@handlers/schoolCalendar';
import * as teacherConfirmations from '@handlers/teacherConfirmations';
import * as qrSettings from '@handlers/qrSettings';
import * as journals from '@handlers/journals';
import * as studentAttendance from '@handlers/studentAttendance';
import * as grades from '@handlers/grades';
import * as gradeAudit from '@handlers/gradeAudit';
import * as teacherSchedule from '@handlers/teacherSchedule';
import * as attendance from '@handlers/attendance';
import * as reports from '@handlers/reports';
import * as parent from '@handlers/parent';
import * as headmaster from '@handlers/headmaster';
import * as announcements from '@handlers/announcements';
import * as notifications from '@handlers/notifications';
import * as rapor from '@handlers/rapor';
import Auth from '@middlewares/auth';
import { strictRateLimit } from '@middlewares/rateLimit';

const Route = createRouter();

// Public
Route.get('/', home.landingPage);

// Auth
Route.get('/login', auth.loginPage);
Route.post('/login', strictRateLimit(), auth.submitLogin);
Route.post('/logout', strictRateLimit(), auth.logout);
Route.post('/change-password', [Auth], auth.changePassword);

// Protected - Dashboard
Route.get('/dashboard', [Auth], dashboard.dashboardPage);

// Protected - Users
Route.get('/users', [Auth], users.usersPage);
Route.get('/profile', [Auth], users.profilePage);
Route.post('/change-profile', [Auth], users.changeProfile);
Route.post('/users', [Auth], users.addUser);
Route.put('/users/:id', [Auth], users.editUser);
Route.delete('/users', [Auth], users.removeUsers);

// Roles
Route.get('/roles', [Auth], roles.rolesPage);
Route.get('/roles/data', [Auth], roles.listRoles);
Route.get('/roles/permissions', [Auth], roles.permissionsData);
Route.post('/roles', [Auth], roles.addRole);
Route.put('/roles/:id', [Auth], roles.editRole);
Route.delete('/roles/:id', [Auth], roles.removeRole);

// Academic Years
Route.get('/academic-years', [Auth], academicYears.academicYearsPage);
Route.get('/academic-years/data', [Auth], academicYears.listAcademicYears);
Route.get('/academic-years/:id', [Auth], academicYears.activeAcademicYearData);
Route.post('/academic-years', [Auth], academicYears.addAcademicYear);
Route.put('/academic-years/:id', [Auth], academicYears.editAcademicYear);
Route.delete('/academic-years/:id', [Auth], academicYears.removeAcademicYear);
Route.post('/academic-years/:id/activate', [Auth], academicYears.activateAcademicYear);
Route.get('/academic-years/:id/components', [Auth], academicYears.gradeComponentsData);
Route.put('/academic-years/:id/components', [Auth], academicYears.saveGradeComponents);
Route.post('/academic-years/:id/publish-grades', [Auth], academicYears.toggleGradesPublication);

// Classes
Route.get('/classes', [Auth], classes.classesPage);
Route.get('/classes/data', [Auth], classes.listClasses);
Route.get('/classes/:id', [Auth], classes.classData);
Route.post('/classes', [Auth], classes.addClass);
Route.put('/classes/:id', [Auth], classes.editClass);
Route.delete('/classes/:id', [Auth], classes.removeClass);
Route.get('/classes/:id/students', [Auth], students.classStudentsPage);

// Subjects
Route.get('/subjects', [Auth], subjects.subjectsPage);
Route.get('/subjects/data', [Auth], subjects.listSubjects);
Route.get('/subjects/:id', [Auth], subjects.subjectData);
Route.post('/subjects', [Auth], subjects.addSubject);
Route.put('/subjects/:id', [Auth], subjects.editSubject);
Route.delete('/subjects/:id', [Auth], subjects.removeSubject);

// Students
Route.get('/students', [Auth], students.studentsPage);
Route.get('/students/data', [Auth], students.listStudents);
Route.get('/students/by-class/:id', [Auth], students.studentsByClass);
Route.get('/students/:id', [Auth], students.studentData);
Route.post('/students', [Auth], students.addStudent);
Route.post('/students/import', [Auth, students.importStudentsMiddleware], students.importStudentsFromCsv);
Route.post('/students/:id/parent', [Auth], students.addStudentParentAccount);
Route.put('/students/:id/parent', [Auth], students.editStudentParentAccount);
Route.delete('/students/:id/parent', [Auth], students.removeStudentParentAccount);
Route.put('/students/:id', [Auth], students.editStudent);
Route.delete('/students/:id', [Auth], students.removeStudent);

// Teachers
Route.get('/teachers', [Auth], teachers.teachersPage);
Route.get('/teachers/data', [Auth], teachers.listTeachers);
Route.get('/teachers/by-user/:userId', [Auth], teachers.teacherByUser);
Route.get('/teachers/:id', [Auth], teachers.teacherData);
Route.post('/teachers', [Auth], teachers.addTeacher);
Route.put('/teachers/:id', [Auth], teachers.editTeacher);
Route.delete('/teachers/:id', [Auth], teachers.removeTeacher);
Route.post('/teachers/:id/subjects', [Auth], teachers.assignTeacherSubjects);
Route.get('/teacher-assignments', [Auth], teacherAssignments.teacherAssignmentsPage);
Route.post('/teacher-assignments/:teacherId', [Auth], teacherAssignments.saveTeacherAssignments);

// Parents
Route.get('/parents', [Auth], parents.parentsPage);
Route.get('/parents/data', [Auth], parents.listParents);
Route.get('/parents/by-user/:userId', [Auth], parents.parentByUser);
Route.get('/parents/:id', [Auth], parents.parentData);

// Schedules
Route.get('/schedules', [Auth], schedules.schedulesPage);
Route.get('/schedules/data', [Auth], schedules.listSchedules);
Route.get('/schedules/:id', [Auth], schedules.scheduleData);
Route.post('/schedules', [Auth], schedules.addSchedule);
Route.put('/schedules/:id', [Auth], schedules.editSchedule);
Route.delete('/schedules/:id', [Auth], schedules.removeSchedule);

// School Locations
Route.get('/school-locations', [Auth], schoolLocations.schoolLocationsPage);
Route.put('/school-locations', [Auth], schoolLocations.saveSchoolProfile);

// School Calendar (holidays + effective-day settings)
Route.get('/school-calendar', [Auth], schoolCalendar.schoolCalendarPage);
Route.put('/school-calendar/settings', [Auth], schoolCalendar.saveSchoolCalendarSettings);
Route.post('/school-calendar/holidays', [Auth], schoolCalendar.addSchoolHoliday);
Route.delete('/school-calendar/holidays/:id', [Auth], schoolCalendar.removeSchoolHoliday);

// Teacher Confirmations (anti-fraud)
Route.get('/teacher/confirm', [Auth], teacherConfirmations.confirmPage);
Route.get('/teacher/confirmations', [Auth], teacherConfirmations.teacherConfirmationsPage);
Route.get('/teacher/confirmations/data', [Auth], teacherConfirmations.listTeacherConfirmations);
Route.get('/teacher/confirmations/:id', [Auth], teacherConfirmations.teacherConfirmationData);
Route.get('/teacher/confirmations/outside', [Auth], teacherConfirmations.outsideConfirmationsData);
Route.post('/teacher/confirmations', [Auth], teacherConfirmations.submitTeacherConfirmation);

// QR Absen Settings & Display
Route.get('/qr-settings', [Auth], qrSettings.qrSettingsPage);
Route.post('/qr-settings', [Auth], qrSettings.saveQrSettings);
Route.get('/qr-display', [Auth], qrSettings.qrDisplayPage);
Route.get('/qr-settings/qr-data', [Auth], qrSettings.qrCodeData);

// Journals
Route.get('/journals', [Auth], journals.journalsPage);
Route.get('/journals/data', [Auth], journals.listJournals);
Route.get('/journals/:id', [Auth], journals.journalData);
Route.post('/journals', [Auth], journals.addJournal);
Route.put('/journals/:id', [Auth], journals.editJournal);
Route.delete('/journals/:id', [Auth], journals.removeJournal);

// Student Attendance
Route.get('/attendance', [Auth], studentAttendance.studentAttendancePage);
Route.get('/attendance/journal/:journalId', [Auth], studentAttendance.listAttendanceByJournal);
Route.get('/attendance/student/:studentId', [Auth], studentAttendance.listAttendanceByStudent);
Route.post('/attendance', [Auth], studentAttendance.saveAttendance);
Route.delete('/attendance/:id', [Auth], studentAttendance.removeAttendance);

// Grades
Route.get('/grades', [Auth], grades.gradesPage);
Route.get('/grades/data', [Auth], grades.listGrades);
Route.get('/grades/student/:studentId', [Auth], grades.gradesByStudent);
Route.get('/grades/:id', [Auth], grades.gradeData);
Route.post('/grades', [Auth], grades.addGrade);
Route.post('/grades/bulk', [Auth], grades.saveGradesBulk);
Route.post('/grades/components', [Auth], grades.addGradeComponentType);
Route.put('/grades/components/:type', [Auth], grades.renameGradeComponentType);
Route.delete('/grades/components/:type', [Auth], grades.removeGradeComponentType);
Route.put('/grades/:id', [Auth], grades.editGrade);
Route.delete('/grades/:id', [Auth], grades.removeGrade);

// Grade Audit
Route.get('/grade-audit', [Auth], gradeAudit.gradeAuditPage);
Route.get('/grade-audit/data', [Auth], gradeAudit.gradeAuditData);

// Announcements
Route.get('/announcements', [Auth], announcements.announcementsPage);
Route.get('/announcements/data', [Auth], announcements.listAnnouncements);
Route.get('/announcements/latest', [Auth], announcements.latestAnnouncementsData);
Route.post('/announcements', [Auth], announcements.addAnnouncement);
Route.put('/announcements/:id', [Auth], announcements.editAnnouncement);
Route.delete('/announcements/:id', [Auth], announcements.removeAnnouncement);

// Notifications
Route.get('/notifications/data', [Auth], notifications.notificationsData);
Route.post('/notifications/read', [Auth], notifications.markNotificationsRead);

// Rapor
Route.get('/reports/rapor/:studentId', [Auth], rapor.raporPage);

// Teacher Schedule
Route.get('/teacher/schedule', [Auth], teacherSchedule.teacherSchedulePage);
Route.get('/teacher/schedule/today', [Auth], teacherSchedule.listTodaySchedules);
Route.get('/teacher/schedule/:id', [Auth], teacherSchedule.todayScheduleDetail);

// Attendance Reports
Route.get('/attendance/report/:studentId', [Auth], attendance.attendanceReportData);

// Reports
Route.get('/reports/class-subject', [Auth], reports.classSubjectReport);

// Parent Dashboard
Route.get('/parent/dashboard', [Auth], parent.parentDashboardPage);
Route.get('/parent/dashboard/data', [Auth], parent.parentDashboardData);
Route.get('/parent/child/:studentId/attendance', [Auth], parent.childAttendancePage);
Route.get('/parent/child/:studentId/grades', [Auth], parent.parentGradesPage);

// Headmaster Dashboard
Route.get('/headmaster/dashboard', [Auth], headmaster.headmasterDashboardPage);
Route.get('/headmaster/dashboard/data', [Auth], headmaster.headmasterDashboardData);
Route.get('/headmaster/classes/:classId/grades', [Auth], headmaster.headmasterClassGradesPage);
Route.get('/headmaster/teachers/:teacherUserId/attendance', [Auth], headmaster.headmasterTeacherAttendancePage);
Route.get('/headmaster/reports', [Auth], headmaster.headmasterReportsPage);
Route.get('/headmaster/reports/outside-confirmations', [Auth], headmaster.listOutsideConfirmations);

// Assets
Route.post('/assets/avatar', [Auth, strictRateLimit(), assets.avatarMiddleware as any], assets.uploadAsset);
Route.get('/assets/:file', assets.serveDistAsset);
Route.get('/public/*', assets.servePublicAsset);
Route.get('/storage/*', assets.servePublicAsset);

export default Route.getRouter();
