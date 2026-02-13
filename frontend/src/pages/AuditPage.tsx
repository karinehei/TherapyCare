import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { paginatedSchema, auditEventSchema } from "@/api/schemas";

const schema = paginatedSchema(auditEventSchema);

export function AuditPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-events"],
    queryFn: async () => {
      const res = await api.get<unknown>("/audit/events/");
      return schema.parse(res);
    },
  });

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">Loading audit events…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state error">
          Failed to load audit events. (Support role only)
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">{data?.count ?? 0} event(s)</p>
      </div>

      <div className="card">
        {!data?.results.length ? (
          <div className="empty-state">No audit events yet.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.created_at).toLocaleString()}</td>
                    <td>{e.action}</td>
                    <td>{e.entity_type}</td>
                    <td>{e.entity_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
