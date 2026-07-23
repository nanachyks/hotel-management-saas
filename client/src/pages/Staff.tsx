import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { btn, btnSm, input, select, card, pageTitle, sectionTitle, tableHeader as th, tableCell as td, colors, formatCurrency, statusBadge } from '../styles';

interface Employee { id: string; department_id: string; department_name: string; first_name: string; last_name: string; email: string; phone: string; position: string; hourly_rate: number; status: string; }
interface Department { id: string; name: string; description: string; }
interface Shift { id: string; employee_id: string; employee_name: string; date: string; start_time: string; end_time: string; notes: string; }
interface Attendance { id: string; employee_id: string; employee_name: string; date: string; check_in: string; check_out: string; status: string; notes: string; }

const tabs = ['Employees', 'Departments', 'Shifts', 'Attendance'];

const statusColors: Record<string, string> = {
  present: '#22c55e', absent: '#ef4444', late: '#f59e0b', half_day: '#f97316',
};

const attendanceStatuses = ['present', 'absent', 'late', 'half_day'];

export default function Staff() {
  const { toast } = useToast();
  const [tab, setTab] = useState(0);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const [empForm, setEmpForm] = useState({ first_name: '', last_name: '', department_id: '', position: '', email: '', phone: '', hourly_rate: '' });
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [shiftForm, setShiftForm] = useState({ employee_id: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', notes: '' });
  const [attForm, setAttForm] = useState({ employee_id: '', date: new Date().toISOString().split('T')[0], check_in: '', check_out: '', status: 'present', notes: '' });

  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterEmpStatus, setFilterEmpStatus] = useState('');
  const [filterShiftEmpId, setFilterShiftEmpId] = useState('');
  const [filterShiftDate, setFilterShiftDate] = useState('');
  const [filterAttEmpId, setFilterAttEmpId] = useState('');
  const [filterAttDate, setFilterAttDate] = useState('');
  const [filterAttStatus, setFilterAttStatus] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);

  const loadDepartments = () => api.get<{ data: Department[] }>('/departments').then(r => setDepartments(r.data || r as any)).catch(() => {});

  const loadEmployees = () => {
    const params = new URLSearchParams();
    if (filterDeptId) params.set('department_id', filterDeptId);
    if (filterEmpStatus) params.set('status', filterEmpStatus);
    const q = params.toString();
    setLoading(true);
    api.get<{ data: Employee[] }>(`/employees${q ? `?${q}` : ''}`)
      .then(r => setEmployees(r.data || r as any))
      .catch(() => toast('Failed to load employees', 'error'))
      .finally(() => setLoading(false));
  };

  const loadAllEmployees = () => {
    api.get<{ data: Employee[] }>('/employees')
      .then(r => setAllEmployees(r.data || r as any))
      .catch(() => {});
  };

  const loadShifts = () => {
    const params = new URLSearchParams();
    if (filterShiftEmpId) params.set('employee_id', filterShiftEmpId);
    if (filterShiftDate) params.set('date', filterShiftDate);
    const q = params.toString();
    setLoading(true);
    api.get<{ data: Shift[] }>(`/shifts${q ? `?${q}` : ''}`)
      .then(r => setShifts(r.data || r as any))
      .catch(() => toast('Failed to load shifts', 'error'))
      .finally(() => setLoading(false));
  };

  const loadAttendance = () => {
    const params = new URLSearchParams();
    if (filterAttEmpId) params.set('employee_id', filterAttEmpId);
    if (filterAttDate) params.set('date', filterAttDate);
    if (filterAttStatus) params.set('status', filterAttStatus);
    const q = params.toString();
    setLoading(true);
    api.get<{ data: Attendance[] }>(`/attendance${q ? `?${q}` : ''}`)
      .then(r => setAttendance(r.data || r as any))
      .catch(() => toast('Failed to load attendance', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDepartments();
    loadAllEmployees();
  }, []);

  useEffect(() => {
    if (tab === 0) loadEmployees();
    else if (tab === 1) { setLoading(true); loadDepartments().finally(() => setLoading(false)); }
    else if (tab === 2) loadShifts();
    else if (tab === 3) loadAttendance();
  }, [tab, filterDeptId, filterEmpStatus, filterShiftEmpId, filterShiftDate, filterAttEmpId, filterAttDate, filterAttStatus]);

  const openNew = () => {
    setEdit(null); setShowForm(true);
    switch (tab) {
      case 0: setEmpForm({ first_name: '', last_name: '', department_id: '', position: '', email: '', phone: '', hourly_rate: '' }); break;
      case 1: setDeptForm({ name: '', description: '' }); break;
      case 2: setShiftForm({ employee_id: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', notes: '' }); break;
      case 3: setAttForm({ employee_id: '', date: new Date().toISOString().split('T')[0], check_in: '', check_out: '', status: 'present', notes: '' }); break;
    }
  };

  const openEdit = (item: any) => {
    setEdit(item); setShowForm(true);
    switch (tab) {
      case 0:
        setEmpForm({ first_name: item.first_name, last_name: item.last_name, department_id: item.department_id, position: item.position, email: item.email, phone: item.phone, hourly_rate: String(item.hourly_rate) });
        break;
      case 1:
        setDeptForm({ name: item.name, description: item.description || '' });
        break;
      case 2:
        setShiftForm({ employee_id: item.employee_id, date: item.date, start_time: item.start_time, end_time: item.end_time, notes: item.notes || '' });
        break;
      case 3:
        setAttForm({ employee_id: item.employee_id, date: item.date, check_in: item.check_in || '', check_out: item.check_out || '', status: item.status, notes: item.notes || '' });
        break;
    }
  };

  const save = async () => {
    try {
      if (tab === 0) {
        const body = { ...empForm, hourly_rate: Number(empForm.hourly_rate) };
        if (edit) { await api.put(`/employees/${edit.id}`, body); toast('Employee updated', 'success'); }
        else { await api.post('/employees', body); toast('Employee created', 'success'); }
      } else if (tab === 1) {
        if (edit) { await api.put(`/departments/${edit.id}`, deptForm); toast('Department updated', 'success'); }
        else { await api.post('/departments', deptForm); toast('Department created', 'success'); }
      } else if (tab === 2) {
        if (edit) { await api.put(`/shifts/${edit.id}`, shiftForm); toast('Shift updated', 'success'); }
        else { await api.post('/shifts', shiftForm); toast('Shift created', 'success'); }
      } else if (tab === 3) {
        if (edit) { await api.put(`/attendance/${edit.id}`, attForm); toast('Attendance updated', 'success'); }
        else { await api.post('/attendance', attForm); toast('Attendance created', 'success'); }
      }
      setShowForm(false); loadCurrentTab();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirmDelete) return;
    try {
      const paths = ['/employees/', '/departments/', '/shifts/', '/attendance/'];
      await api.del(`${paths[tab]}${id}`);
      toast('Deleted', 'success');
      setConfirmDelete(null);
      loadCurrentTab();
    } catch (e: any) { toast(e.message, 'error'); setConfirmDelete(null); }
  };

  const loadCurrentTab = () => {
    switch (tab) {
      case 0: loadEmployees(); break;
      case 1: setLoading(true); loadDepartments().finally(() => setLoading(false)); break;
      case 2: loadShifts(); break;
      case 3: loadAttendance(); break;
    }
  };

  const renderForm = () => {
    switch (tab) {
      case 0: return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <input placeholder="First Name" value={empForm.first_name} onChange={e => setEmpForm({ ...empForm, first_name: e.target.value })} style={input} />
          <input placeholder="Last Name" value={empForm.last_name} onChange={e => setEmpForm({ ...empForm, last_name: e.target.value })} style={input} />
          <select value={empForm.department_id} onChange={e => setEmpForm({ ...empForm, department_id: e.target.value })} style={select}>
            <option value="">Select Department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input placeholder="Position" value={empForm.position} onChange={e => setEmpForm({ ...empForm, position: e.target.value })} style={input} />
          <input placeholder="Email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} style={input} />
          <input placeholder="Phone" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} style={input} />
          <input type="number" step="0.01" placeholder="Hourly Rate" value={empForm.hourly_rate} onChange={e => setEmpForm({ ...empForm, hourly_rate: e.target.value })} style={input} />
        </div>
      );
      case 1: return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <input placeholder="Department Name" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} style={input} />
          <input placeholder="Description" value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} style={input} />
        </div>
      );
      case 2: return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 14 }}>
          <select value={shiftForm.employee_id} onChange={e => setShiftForm({ ...shiftForm, employee_id: e.target.value })} style={select}>
            <option value="">Select Employee</option>
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
          <input type="date" value={shiftForm.date} onChange={e => setShiftForm({ ...shiftForm, date: e.target.value })} style={input} />
          <input type="time" value={shiftForm.start_time} onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })} style={input} />
          <input type="time" value={shiftForm.end_time} onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })} style={input} />
          <input placeholder="Notes" value={shiftForm.notes} onChange={e => setShiftForm({ ...shiftForm, notes: e.target.value })} style={input} />
        </div>
      );
      case 3: return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 14 }}>
          <select value={attForm.employee_id} onChange={e => setAttForm({ ...attForm, employee_id: e.target.value })} style={select}>
            <option value="">Select Employee</option>
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
          <input type="date" value={attForm.date} onChange={e => setAttForm({ ...attForm, date: e.target.value })} style={input} />
          <input type="time" value={attForm.check_in} onChange={e => setAttForm({ ...attForm, check_in: e.target.value })} style={input} />
          <input type="time" value={attForm.check_out} onChange={e => setAttForm({ ...attForm, check_out: e.target.value })} style={input} />
          <select value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value })} style={select}>
            {attendanceStatuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <input placeholder="Notes" value={attForm.notes} onChange={e => setAttForm({ ...attForm, notes: e.target.value })} style={input} />
        </div>
      );
    }
  };

  const renderTable = () => {
    if (loading) return <LoadingSkeleton rows={6} />;

    switch (tab) {
      case 0:
        if (employees.length === 0) return <p style={{ color: colors.slate }}>No employees found.</p>;
        return (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>Name</th><th style={th}>Department</th><th style={th}>Position</th><th style={th}>Email</th><th style={th}>Phone</th><th style={th}>Hourly Rate</th><th style={th}>Status</th><th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                      onMouseEnter={e2 => e2.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...td, fontWeight: 600 }}>{e.first_name} {e.last_name}</td>
                    <td style={td}><span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', fontSize: 13 }}>{e.department_name}</span></td>
                    <td style={td}>{e.position}</td>
                    <td style={td}>{e.email}</td>
                    <td style={td}>{e.phone}</td>
                    <td style={td}>{formatCurrency(e.hourly_rate)}</td>
                    <td style={td}><span style={statusBadge(e.status)}>{e.status}</span></td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(e)} style={btnSm}>Edit</button>
                        <button onClick={() => setConfirmDelete({ id: e.id, label: `${e.first_name} ${e.last_name}` })} style={{ ...btnSm, color: colors.danger }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 1:
        if (departments.length === 0) return <p style={{ color: colors.slate }}>No departments found.</p>;
        return (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>Name</th><th style={th}>Description</th><th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                      onMouseEnter={e2 => e2.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...td, fontWeight: 600 }}>{d.name}</td>
                    <td style={td}>{d.description || '-'}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(d)} style={btnSm}>Edit</button>
                        <button onClick={() => setConfirmDelete({ id: d.id, label: d.name })} style={{ ...btnSm, color: colors.danger }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 2:
        if (shifts.length === 0) return <p style={{ color: colors.slate }}>No shifts found.</p>;
        return (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>Employee</th><th style={th}>Date</th><th style={th}>Start Time</th><th style={th}>End Time</th><th style={th}>Notes</th><th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                      onMouseEnter={e2 => e2.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...td, fontWeight: 600 }}>{s.employee_name}</td>
                    <td style={td}>{s.date}</td>
                    <td style={td}>{s.start_time}</td>
                    <td style={td}>{s.end_time}</td>
                    <td style={{ ...td, fontSize: 13, color: colors.slate }}>{s.notes || '-'}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(s)} style={btnSm}>Edit</button>
                        <button onClick={() => setConfirmDelete({ id: s.id, label: `${s.employee_name} shift` })} style={{ ...btnSm, color: colors.danger }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 3:
        if (attendance.length === 0) return <p style={{ color: colors.slate }}>No attendance records found.</p>;
        return (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                  <th style={th}>Employee</th><th style={th}>Date</th><th style={th}>Check In</th><th style={th}>Check Out</th><th style={th}>Status</th><th style={th}>Notes</th><th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: 'background 0.15s' }}
                      onMouseEnter={e2 => e2.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...td, fontWeight: 600 }}>{a.employee_name}</td>
                    <td style={td}>{a.date}</td>
                    <td style={td}>{a.check_in || '-'}</td>
                    <td style={td}>{a.check_out || '-'}</td>
                    <td style={td}><span style={{ ...statusBadge(a.status), background: statusColors[a.status] || '#475569' }}>{a.status.replace('_', ' ')}</span></td>
                    <td style={{ ...td, fontSize: 13, color: colors.slate }}>{a.notes || '-'}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(a)} style={btnSm}>Edit</button>
                        <button onClick={() => setConfirmDelete({ id: a.id, label: `${a.employee_name} attendance` })} style={{ ...btnSm, color: colors.danger }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  const renderFilters = () => {
    switch (tab) {
      case 0: return (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <select value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)} style={{ ...select, width: 180 }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterEmpStatus} onChange={e => setFilterEmpStatus(e.target.value)} style={{ ...select, width: 140 }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      );
      case 1: return null;
      case 2: return (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <select value={filterShiftEmpId} onChange={e => setFilterShiftEmpId(e.target.value)} style={{ ...select, width: 180 }}>
            <option value="">All Employees</option>
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
          <input type="date" value={filterShiftDate} onChange={e => setFilterShiftDate(e.target.value)} style={{ ...input, width: 160 }} />
        </div>
      );
      case 3: return (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <select value={filterAttEmpId} onChange={e => setFilterAttEmpId(e.target.value)} style={{ ...select, width: 180 }}>
            <option value="">All Employees</option>
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
          <input type="date" value={filterAttDate} onChange={e => setFilterAttDate(e.target.value)} style={{ ...input, width: 160 }} />
          <select value={filterAttStatus} onChange={e => setFilterAttStatus(e.target.value)} style={{ ...select, width: 140 }}>
            <option value="">All Status</option>
            {attendanceStatuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      );
    }
  };

  const tabTitles = ['Employees', 'Departments', 'Shifts', 'Attendance'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Staff Management</h1>
        <button onClick={openNew} style={btn}>+ New {tabTitles[tab].slice(0, -1)}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => { setTab(i); setShowForm(false); setEdit(null); }}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              background: i === tab ? colors.primary : colors.input, color: '#fff', transition: 'all 0.15s ease',
            }}>
            {t}
          </button>
        ))}
      </div>

      <h2 style={sectionTitle}>{tabTitles[tab]}</h2>

      {renderFilters()}

      {showForm && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={sectionTitle}>{edit ? `Edit ${tabTitles[tab].slice(0, -1)}` : `New ${tabTitles[tab].slice(0, -1)}`}</h2>
          {renderForm()}
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnSm, color: colors.slate }}>Cancel</button>
          </div>
        </div>
      )}

      {renderTable()}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Item"
        message={`Are you sure you want to delete ${confirmDelete?.label}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => remove(confirmDelete!.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
