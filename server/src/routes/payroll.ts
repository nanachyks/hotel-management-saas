import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const payrollRouter = Router();
const db = getDb();

payrollRouter.get('/periods', async (req: AuthRequest, res: Response) => {
  const periods = await db.queryAll('SELECT * FROM payroll_periods WHERE hotel_id = ? ORDER BY start_date DESC', [req.user!.hotel_id]);
  res.json(periods);
});

payrollRouter.post('/periods', async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.body;
  if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date required' });
  const id = uuid();
  await db.execute('INSERT INTO payroll_periods (id, hotel_id, start_date, end_date) VALUES (?, ?, ?, ?)',
    [id, req.user!.hotel_id, start_date, end_date]);
  res.status(201).json(await db.queryOne('SELECT * FROM payroll_periods WHERE id = ?', [id]));
});

payrollRouter.put('/periods/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM payroll_periods WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Period not found' });
  const { status, processed_at } = req.body;
  if (status) await db.execute("UPDATE payroll_periods SET status = ?, processed_at = NOW() WHERE id = ? AND hotel_id = ?", [status, req.params.id, req.user!.hotel_id]);
  res.json(await db.queryOne('SELECT * FROM payroll_periods WHERE id = ?', [req.params.id]));
});

payrollRouter.get('/deductions', async (req: AuthRequest, res: Response) => {
  const deductions = await db.queryAll('SELECT * FROM payroll_deductions WHERE hotel_id = ?', [req.user!.hotel_id]);
  res.json(deductions);
});

payrollRouter.post('/deductions', async (req: AuthRequest, res: Response) => {
  const { name, type, value, is_mandatory } = req.body;
  if (!name || !type || value === undefined) return res.status(400).json({ error: 'name, type, value required' });
  const id = uuid();
  await db.execute('INSERT INTO payroll_deductions (id, hotel_id, name, type, value, is_mandatory) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, name, type, Number(value), !!is_mandatory]);
  res.status(201).json(await db.queryOne('SELECT * FROM payroll_deductions WHERE id = ?', [id]));
});

payrollRouter.delete('/deductions/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM payroll_deductions WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Deduction not found' });
  await db.execute('DELETE FROM payroll_deductions WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  res.json({ message: 'Deduction deleted' });
});

payrollRouter.get('/entries', async (req: AuthRequest, res: Response) => {
  const { period_id } = req.query;
  let query = `SELECT pe.*, e.first_name, e.last_name, e.position, e.department_id, d.name as department_name
    FROM payroll_entries pe
    JOIN employees e ON pe.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE pe.hotel_id = ?`;
  const params: string[] = [req.user!.hotel_id];
  if (period_id) { query += ' AND pe.period_id = ?'; params.push(period_id as string); }
  query += ' ORDER BY e.first_name ASC';
  res.json(await db.queryAll(query, params));
});

payrollRouter.post('/process', async (req: AuthRequest, res: Response) => {
  const { period_id } = req.body;
  if (!period_id) return res.status(400).json({ error: 'period_id required' });

  const period = await db.queryOne('SELECT * FROM payroll_periods WHERE id = ? AND hotel_id = ?', [period_id, req.user!.hotel_id]);
  if (!period) return res.status(404).json({ error: 'Period not found' });

  await db.execute("UPDATE payroll_periods SET status = 'processing' WHERE id = ? AND hotel_id = ?", [period_id, req.user!.hotel_id]);

  const employees = await db.queryAll("SELECT * FROM employees WHERE hotel_id = ? AND status = 'active'", [req.user!.hotel_id]);
  const deductions = await db.queryAll('SELECT * FROM payroll_deductions WHERE hotel_id = ?', [req.user!.hotel_id]);
  const entries: any[] = [];

  for (const emp of employees) {
    const basePay = emp.hourly_rate * 160;
    const bonuses = 0;
    let deductionsTotal = 0;
    const dedBreakdown: any[] = [];
    for (const d of deductions) {
      let amount = d.type === 'percentage' ? basePay * (d.value / 100) : d.value;
      deductionsTotal += amount;
      dedBreakdown.push({ name: d.name, amount: Math.round(amount * 100) / 100 });
    }
    const netPay = Math.max(0, basePay + bonuses - deductionsTotal);
    const entryId = uuid();
    await db.execute(
      'INSERT INTO payroll_entries (id, hotel_id, period_id, employee_id, base_pay, overtime_pay, bonuses, deductions_total, net_pay) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [entryId, req.user!.hotel_id, period_id, emp.id, basePay, 0, bonuses, Math.round(deductionsTotal * 100) / 100, Math.round(netPay * 100) / 100]
    );
    const payslipId = uuid();
    await db.execute(
      'INSERT INTO payslips (id, entry_id, hotel_id, employee_id, period_id, gross_pay, deductions_breakdown, net_pay) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [payslipId, entryId, req.user!.hotel_id, emp.id, period_id, basePay + bonuses, JSON.stringify(dedBreakdown), Math.round(netPay * 100) / 100]
    );
    entries.push({ entryId, employee: `${emp.first_name} ${emp.last_name}`, basePay, deductionsTotal, netPay });
  }

  await db.execute("UPDATE payroll_periods SET status = 'closed', processed_at = NOW() WHERE id = ? AND hotel_id = ?", [period_id, req.user!.hotel_id]);
  res.json({ message: 'Payroll processed', entries: entries.length, totalPayroll: entries.reduce((s: number, e: any) => s + e.netPay, 0) });
});

payrollRouter.get('/payslips', async (req: AuthRequest, res: Response) => {
  const { period_id, employee_id } = req.query;
  let query = `SELECT ps.*, e.first_name, e.last_name, e.position, pp.start_date, pp.end_date
    FROM payslips ps
    JOIN employees e ON ps.employee_id = e.id
    JOIN payroll_periods pp ON ps.period_id = pp.id
    WHERE ps.hotel_id = ?`;
  const params: string[] = [req.user!.hotel_id];
  if (period_id) { query += ' AND ps.period_id = ?'; params.push(period_id as string); }
  if (employee_id) { query += ' AND ps.employee_id = ?'; params.push(employee_id as string); }
  query += ' ORDER BY ps.generated_at DESC';
  res.json(await db.queryAll(query, params));
});

payrollRouter.get('/summary', async (req: AuthRequest, res: Response) => {
  const currentPeriod = await db.queryOne("SELECT * FROM payroll_periods WHERE hotel_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1", [req.user!.hotel_id]);
  const totalEmployees = (await db.queryOne("SELECT COUNT(*) as count FROM employees WHERE hotel_id = ? AND status = 'active'", [req.user!.hotel_id])).count;
  const totalPayroll = (await db.queryOne("SELECT COALESCE(SUM(net_pay), 0) as total FROM payroll_entries WHERE hotel_id = ? AND status = 'paid'", [req.user!.hotel_id])).total || 0;
  const pendingEntries = (await db.queryOne("SELECT COUNT(*) as count FROM payroll_entries WHERE hotel_id = ? AND status = 'pending'", [req.user!.hotel_id])).count;

  res.json({ currentPeriod, totalEmployees, totalPayroll, pendingEntries });
});
