import { ExportService } from '../services/export.service.js';

export async function exportSalesCsv(req, res, next) {
  try {
    const result = await ExportService.exportSalesCsv(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csv);
  } catch (err) {
    next(err);
  }
}

export async function exportExpensesCsv(req, res, next) {
  try {
    const result = await ExportService.exportExpensesCsv(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csv);
  } catch (err) {
    next(err);
  }
}
