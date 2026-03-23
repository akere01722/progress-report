-- =====================================================
-- CORE TABLES
-- =====================================================

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  faculty TEXT NOT NULL,
  department TEXT NOT NULL,
  program TEXT NOT NULL,
  level TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  faculty TEXT NOT NULL,
  department TEXT NOT NULL,
  program TEXT,
  employment TEXT,
  courses INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects/Courses table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  faculty TEXT NOT NULL,
  department TEXT NOT NULL,
  program TEXT NOT NULL,
  level TEXT NOT NULL,
  credits INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  faculty TEXT NOT NULL,
  department TEXT NOT NULL,
  program TEXT NOT NULL,
  level TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ATTENDANCE TABLES
-- =====================================================

-- Student attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Partial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RESULTS/REPORTS TABLES
-- =====================================================

-- CA (Continuous Assessment) scores
CREATE TABLE IF NOT EXISTS ca_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  semester TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam scores
CREATE TABLE IF NOT EXISTS exam_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  semester TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progressive reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  remarks TEXT,
  teacher_comments_sem1 TEXT,
  teacher_comments_sem2 TEXT,
  attendance_sem1_present INTEGER DEFAULT 0,
  attendance_sem1_absent INTEGER DEFAULT 0,
  attendance_sem1_partial INTEGER DEFAULT 0,
  attendance_sem2_present INTEGER DEFAULT 0,
  attendance_sem2_absent INTEGER DEFAULT 0,
  attendance_sem2_partial INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ENROLLMENT TABLES
-- =====================================================

-- Student course enrollments
CREATE TABLE IF NOT EXISTS student_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Dropped')),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES (Security)
-- =====================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ca_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;

-- Public read policies (adjust as needed for your security requirements)
CREATE POLICY "Allow public read on students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read on teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public read on subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read on classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public read on attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Allow public read on ca_scores" ON ca_scores FOR SELECT USING (true);
CREATE POLICY "Allow public read on exam_scores" ON exam_scores FOR SELECT USING (true);
CREATE POLICY "Allow public read on reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public read on student_courses" ON student_courses FOR SELECT USING (true);

-- =====================================================
-- SAMPLE DATA (Remove in production)
-- =====================================================

-- Sample students
INSERT INTO students (student_id, name, email, faculty, department, program, level) VALUES
('ENG-001', 'John Akere', 'john.akere@university.edu', 'Engineering', 'Software Engineering', 'HND', '200'),
('ENG-002', 'Mary Johnson', 'mary.johnson@university.edu', 'Engineering', 'Software Engineering', 'BSc', '300'),
('SCI-014', 'Sarah Williams', 'sarah.williams@university.edu', 'Biomedical Sciences', 'Nursing', 'HND', '100'),
('BUS-001', 'James Brown', 'james.brown@university.edu', 'Business', 'Accounting', 'BSc', '200')
ON CONFLICT (student_id) DO NOTHING;

-- Sample teachers
INSERT INTO teachers (staff_id, name, email, faculty, department, employment, status) VALUES
('TCH-001', 'Dr. Robert Smith', 'robert.smith@university.edu', 'Engineering', 'Software Engineering', 'Full-Time', 'Active'),
('TCH-002', 'Prof. Emily Davis', 'emily.davis@university.edu', 'Business', 'Accounting', 'Full-Time', 'Active')
ON CONFLICT (staff_id) DO NOTHING;

-- Sample subjects
INSERT INTO subjects (code, name, faculty, department, program, level, credits) VALUES
('SE201', 'Data Structures', 'Engineering', 'Software Engineering', 'HND', '200', 3),
('SE203', 'Database Systems', 'Engineering', 'Software Engineering', 'HND', '200', 4),
('ACC101', 'Introduction to Accounting', 'Business', 'Accounting', 'BSc', '100', 3),
('BIO101', 'General Biology', 'Biomedical Sciences', 'Nursing', 'HND', '100', 4)
ON CONFLICT (code) DO NOTHING;

-- Sample attendance records
INSERT INTO attendance (student_id, date, status)
SELECT 
  s.id,
  CURRENT_DATE - (random() * 30)::INTEGER,
  (ARRAY['Present', 'Absent', 'Partial'])[floor(random() * 3 + 1)]
FROM students s
CROSS JOIN generate_series(1, 5);

-- Sample CA scores
INSERT INTO ca_scores (student_id, semester, academic_year, score, max_score)
SELECT 
  s.id,
  'semester1',
  '2025/2026',
  floor(random() * 20)::INTEGER + 1,
  20
FROM students s;

-- Sample exam scores
INSERT INTO exam_scores (student_id, semester, academic_year, score, max_score)
SELECT 
  s.id,
  'semester1',
  '2025/2026',
  floor(random() * 60 + 20)::INTEGER,
  80
FROM students s;
