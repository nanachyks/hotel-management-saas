import { statusBadge } from '../styles';

export default function StatusBadge({ status }: { status: string }) {
  return <span style={statusBadge(status)}>{status.replace('_', ' ')}</span>;
}
