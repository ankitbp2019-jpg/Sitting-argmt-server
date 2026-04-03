import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger.js';

/**
 * Generate PDF for seating plan
 * @param {Object} seatingPlan - The seating plan data
 * @returns {Promise<Buffer>} - PDF as buffer
 */
export const generateSeatingPlanPDF = async (seatingPlan) => {
  try {
    logger.info(`Generating PDF for seating plan ${seatingPlan._id}`);

    return new Promise((resolve, reject) => {
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      // Collect chunks
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(24).font('Helvetica-Bold');
      doc.text('Seating Arrangement Plan', { align: 'center' });
      doc.moveDown();

      // Plan Details
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Plan Details');
      doc.moveDown(0.5);

      doc.fontSize(12).font('Helvetica');
      doc.text(`Date: ${new Date(seatingPlan.date).toLocaleDateString()}`);
      doc.text(`Session: ${seatingPlan.session.charAt(0).toUpperCase() + seatingPlan.session.slice(1)}`);
      doc.text(`Total Rooms: ${seatingPlan.rooms?.length || 0}`);
      doc.text(`Total Students: ${seatingPlan.seats?.filter(s => s.status === 'assigned').length || 0}`);
      doc.moveDown();

      // Room Details
      seatingPlan.rooms.forEach((room, roomIndex) => {
        // Room Header
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text(`Room ${room.roomNumber}`, { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica');
        doc.text(`Capacity: ${room.rows} rows × ${room.cols} columns`);
        doc.moveDown();

        // Get seats for this room
        const roomSeats = seatingPlan.seats.filter(seat => seat.roomNumber === room.roomNumber);
        
        // Group seats by row
        const seatsByRow = {};
        roomSeats.forEach(seat => {
          if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
          seatsByRow[seat.row].push(seat);
        });

        // Sort rows
        const sortedRows = Object.keys(seatsByRow).sort((a, b) => a - b);

        // Table Header
        const tableTop = doc.y;
        const colWidth = 80;
        const rowHeight = 30;
        
        // Headers
        doc.fontSize(10).font('Helvetica-Bold');
        doc.rect(50, tableTop, colWidth, rowHeight).stroke();
        doc.text('Row-Col', 55, tableTop + 10, { width: colWidth - 10 });
        
        doc.rect(50 + colWidth, tableTop, colWidth * 2, rowHeight).stroke();
        doc.text('Enrollment Number', 55 + colWidth, tableTop + 10, { width: colWidth * 2 - 10 });
        
        doc.rect(50 + colWidth * 3, tableTop, colWidth, rowHeight).stroke();
        doc.text('Status', 55 + colWidth * 3, tableTop + 10, { width: colWidth - 10 });

        let currentY = tableTop + rowHeight;

        // Seat Data
        doc.fontSize(9).font('Helvetica');
        sortedRows.forEach(rowNum => {
          const rowSeats = seatsByRow[rowNum].sort((a, b) => a.col - b.col);
          
          rowSeats.forEach(seat => {
            // Check if we need a new page
            if (currentY > doc.page.height - 50) {
              doc.addPage();
              currentY = 50;
            }

            // Row-Col
            doc.rect(50, currentY, colWidth, rowHeight).stroke();
            doc.text(`R${seat.row}C${seat.col}`, 55, currentY + 8, { width: colWidth - 10 });
            
            // Enrollment Number
            doc.rect(50 + colWidth, currentY, colWidth * 2, rowHeight).stroke();
            const enrollmentText = seat.enrollmentNumber || 'EMPTY';
            doc.text(enrollmentText, 55 + colWidth, currentY + 8, { width: colWidth * 2 - 10 });
            
            // Status
            doc.rect(50 + colWidth * 3, currentY, colWidth, rowHeight).stroke();
            doc.text(seat.status, 55 + colWidth * 3, currentY + 8, { width: colWidth - 10 });

            currentY += rowHeight;
          });
        });

        doc.y = currentY + 20;

        // Add new page if not last room
        if (roomIndex < seatingPlan.rooms.length - 1) {
          doc.addPage();
        }
      });

      // Footer
      doc.fontSize(10).font('Helvetica-Oblique');
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      // Finalize PDF
      doc.end();
    });

  } catch (error) {
    logger.error(`Error generating PDF for seating plan:`, error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};

export default {
  generateSeatingPlanPDF,
};
