function doGet() {
    return HtmlService.createHtmlOutputFromFile('form');
}

function saveRequisition(data, branchName, branchCode, currentDate) {
    try {
        Logger.log('Starting saveRequisition function...');

        // Generate Requisition ID
        const requisitionNo = generateRequisitionNo(branchCode);
        Logger.log('Generated Requisition Number: ' + requisitionNo);

        // Save data to Google Sheets
        const sheet = SpreadsheetApp
            .openById('10BHEHZrXtgIpfVqIJBLZvFGuavw2ge-Xr6GCDNycAs4') // Replace with your Sheet ID
            .getSheetByName('Sheet1'); // Replace with your sheet name if different

        if (!sheet) {
            throw new Error('Sheet1 not found. Please check the sheet name.');
        }

        data.forEach(row => {
            sheet.appendRow([
                requisitionNo, // Requisition ID as the first column
                currentDate, // Date
                branchName, // Branch Name
                branchCode, // Branch Code
                row.courseType, // Course Type
                row.item, // Item
                row.level, // Level
                row.batchNo, // Batch No
                row.quantity, // Quantity
                row.remarks || '' // Remarks (handle empty remarks)
            ]);
        });

        Logger.log('Data saved to Sheet1.');

        // Generate PDF
        const pdfBase64 = createPdf(data, branchName, branchCode, requisitionNo, currentDate);
        Logger.log('PDF generated successfully.');

        // Upload PDF to Google Drive
        const folderId = '1e8dgi8QcqC3JOfvg-krN6qyxDqnc92gj'; // Replace with your folder ID
        Logger.log('Attempting to access folder with ID: ' + folderId);

        const folder = DriveApp.getFolderById(folderId);
        if (!folder) {
            throw new Error('Google Drive folder not found. Please check the folder ID.');
        }
        Logger.log('Folder accessed successfully: ' + folder.getName());

        const fileName = `Requisition_${requisitionNo}.pdf`;
        const fileBlob = Utilities.newBlob(Utilities.base64Decode(pdfBase64), 'application/pdf', fileName);
        const file = folder.createFile(fileBlob);
        Logger.log('PDF uploaded to Google Drive: ' + file.getName());

        // Get the shareable link
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const fileUrl = file.getUrl();
        Logger.log('Shareable link: ' + fileUrl);

        // Log details in Sheet2
        const logSheet = SpreadsheetApp
            .openById('10BHEHZrXtgIpfVqIJBLZvFGuavw2ge-Xr6GCDNycAs4') // Replace with your Sheet ID
            .getSheetByName('Sheet2'); // Replace with your sheet name if different

        if (!logSheet) {
            throw new Error('Sheet2 not found. Please check the sheet name.');
        }

        logSheet.appendRow([
            currentDate,
            requisitionNo,
            branchName,
            branchCode, // Column A: Requisition Number
            fileUrl, // Column B: File Uploaded Link
        ]);
        Logger.log('Details logged in Sheet2.');

        // Return success response
        return {
            success: true,
            pdfBase64: pdfBase64,
            message: 'Requisition saved and PDF uploaded successfully!'
        };
    } catch (error) {
        Logger.log('Error in saveRequisition: ' + error.toString());
        return {
            success: false,
            message: 'Failed to process the requisition. Please try again. Error: ' + error.message
        };
    }
}
function generateRequisitionNo(branchCode) {
    const timestamp = new Date().getTime();
    const randomNumber = Math.random();
    const combinedValue = timestamp * randomNumber * randomNumber;
    return `RALH-${branchCode}-${Math.floor(combinedValue).toString().slice(-8)}`;
}

function createPdf(data, branchName, branchCode, requisitionNo, currentDate) {
    const htmlTemplate = `
        <html>
        <head>
            <style>
                @page {
                    size: A4 landscape;
                    margin: 5mm;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    text-align: center;
                    position: relative;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px auto;
                    table-layout: fixed; /* Ensure fixed column widths */
                }
                th, td {
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: center;
                    word-wrap: break-word; /* Wrap long text */
                }
                th {
                    background-color: #f2f2f2;
                }
                .course-type-column { width: 10%; }
                .item-column { width: 20%; }
                .level-column { width: 10%; }
                .batch-no-column { width: 10%; }
                .quantity-column { width: 10%; }
                .remarks-column { width: 40%; }
                .due-details {
                    position: absolute;
                    top: 5mm;
                    right: 12mm;
                    text-align: right;
                    font-size: 13px;
                }
                .branch-details {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .signature-section {
                    position: absolute;
                    bottom: 10mm;
                    left: 10mm;
                    right: 10mm;
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 5px;
                }
                .signature-section div {
                    padding: 8px;
                    text-align: center;
                }
                .signature-line {
                    padding: 8px 8px 30px 8px;
                    border-bottom: 1px solid #000;
                }
                .requisition-no {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .current-date {
                    position: absolute;
                    top: 5mm;
                    left: 10mm;
                    font-size: 14px;
                    text-align: left;
                }
            </style>
        </head>
        <body>
            <!-- Current Date (Top Left Corner) -->
            <div class="current-date">Date: ${currentDate}</div>

            <!-- Title -->
            <h2>ALOHA Bangladesh</h2>
            <h3>Class Room Supplies Requisition Slip</h3>

            <!-- Requisition No -->
            <div class="requisition-no">Requisition ID: ${requisitionNo}</div>

            <!-- Branch Details -->
            <div class="branch-details">
                <div><strong>Branch Name:</strong> ${branchName}</div>
                <div><strong>Branch Code:</strong> ${branchCode}</div>
            </div>

            <!-- Due Details -->
            <div class="due-details">
                <p>Previous Due Tk: .........................</p>
                <p>Over Due Tk: .........................</p>
            </div>

            <!-- Requisition Table -->
            <table>
                <thead>
                    <tr>
                        <th class="course-type-column">Course Type</th>
                        <th class="item-column">Item</th>
                        <th class="level-column">Level</th>
                        <th class="batch-no-column">Batch No</th>
                        <th class="quantity-column">Quantity</th>
                        <th class="remarks-column">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td class="course-type-column">${row.courseType}</td>
                            <td class="item-column">${row.item}</td>
                            <td class="level-column">${row.level}</td>
                            <td class="batch-no-column">${row.batchNo}</td>
                            <td class="quantity-column">${row.quantity}</td>
                            <td class="remarks-column">${row.remarks || ''}</td> <!-- Handle empty remarks -->
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <!-- Signature Section -->
            <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-line"></div>
                <div class="signature-line"></div>
                <div class="signature-line"></div>
                <div class="signature-line"></div>

                <div>Requisition By</div>
                <div>Checked By</div>
                <div>Authorized by</div>
                <div>Issued By</div>
                <div>Received by</div>
            </div>
        </body>
        </html>
    `;

    Logger.log('HTML Template:', htmlTemplate);

    const blob = Utilities.newBlob(htmlTemplate, MimeType.HTML, 'temp.html').getAs('application/pdf');
    return Utilities.base64Encode(blob.getBytes());
}