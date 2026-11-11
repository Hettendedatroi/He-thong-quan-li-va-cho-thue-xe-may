using System.IO.Compression;
using System.Text;
using System.Xml;

/// <summary>One non-sensitive sample rental row for the demonstration dashboard export.</summary>
public sealed record DemoRentalExportRow(
    string OrderId,
    string CustomerName,
    string MotorcycleName,
    string Period,
    string Amount,
    string Status);

/// <summary>Request containing only the sample rental rows currently displayed in the dashboard.</summary>
public sealed record DemoRentalExportRequest(IReadOnlyList<DemoRentalExportRow>? Rows);

public static class DemoExcelExport
{
    private const string SpreadsheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

    public static byte[] Create(IReadOnlyList<DemoRentalExportRow> rows, CancellationToken cancellationToken)
    {
        using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteTextEntry(archive, "[Content_Types].xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
                + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
                + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
                + "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>"
                + "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>"
                + "</Types>");
            WriteTextEntry(archive, "_rels/.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
                + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>"
                + "</Relationships>");
            WriteTextEntry(archive, "xl/workbook.xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" "
                + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
                + "<sheets><sheet name=\"Đơn mẫu\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
            WriteTextEntry(archive, "xl/_rels/workbook.xml.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
                + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>"
                + "</Relationships>");

            var sheet = archive.CreateEntry("xl/worksheets/sheet1.xml", CompressionLevel.Optimal);
            using var stream = sheet.Open();
            using var writer = XmlWriter.Create(stream, new XmlWriterSettings
            {
                Encoding = new UTF8Encoding(false),
                CloseOutput = false
            });

            writer.WriteStartDocument(true);
            writer.WriteStartElement("worksheet", SpreadsheetNamespace);
            writer.WriteStartElement("sheetData", SpreadsheetNamespace);
            WriteRow(writer, 1, ["Dữ liệu minh họa, không phải giao dịch thật."], cancellationToken);
            WriteRow(writer, 3, ["Mã đơn", "Khách hàng", "Xe", "Thời gian", "Tổng tiền", "Trạng thái"], cancellationToken);
            for (var index = 0; index < rows.Count; index++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var row = rows[index];
                WriteRow(writer, index + 4,
                    [row.OrderId, row.CustomerName, row.MotorcycleName, row.Period, row.Amount, row.Status],
                    cancellationToken);
            }

            writer.WriteEndElement();
            writer.WriteEndElement();
            writer.WriteEndDocument();
        }

        return output.ToArray();
    }

    private static void WriteRow(XmlWriter writer, int rowNumber, IReadOnlyList<string> values, CancellationToken cancellationToken)
    {
        writer.WriteStartElement("row", SpreadsheetNamespace);
        writer.WriteAttributeString("r", rowNumber.ToString());
        for (var column = 0; column < values.Count; column++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            writer.WriteStartElement("c", SpreadsheetNamespace);
            writer.WriteAttributeString("r", $"{ColumnName(column)}{rowNumber}");
            writer.WriteAttributeString("t", "inlineStr");
            writer.WriteStartElement("is", SpreadsheetNamespace);
            writer.WriteStartElement("t", SpreadsheetNamespace);
            writer.WriteAttributeString("xml", "space", "http://www.w3.org/XML/1998/namespace", "preserve");
            writer.WriteString(values[column]);
            writer.WriteEndElement();
            writer.WriteEndElement();
            writer.WriteEndElement();
        }

        writer.WriteEndElement();
    }

    private static string ColumnName(int zeroBasedColumn)
    {
        var name = string.Empty;
        for (var value = zeroBasedColumn + 1; value > 0; value = (value - 1) / 26)
            name = (char)('A' + (value - 1) % 26) + name;
        return name;
    }

    private static void WriteTextEntry(ZipArchive archive, string name, string content)
    {
        var entry = archive.CreateEntry(name, CompressionLevel.Optimal);
        using var stream = entry.Open();
        using var writer = new StreamWriter(stream, new UTF8Encoding(false));
        writer.Write(content);
    }
}
