-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN "attendanceSessionId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "AttendanceSession" ADD COLUMN "sessionId" INTEGER;
ALTER TABLE "AttendanceSession" ADD COLUMN "qrToken" TEXT;
ALTER TABLE "AttendanceSession" ADD COLUMN "qrIssuedAt" TIMESTAMP(3);
ALTER TABLE "AttendanceSession" ADD COLUMN "qrExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_qrToken_key" ON "AttendanceSession"("qrToken");

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
