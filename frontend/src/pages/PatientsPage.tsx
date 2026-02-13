import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { paginatedSchema, patientListSchema } from "@/api/schemas";

const schema = paginatedSchema(patientListSchema);

export function PatientsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get<unknown>("/patients/");
      return schema.parse(res);
    },
  });

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">Loading patients…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state error">Failed to load patients.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Patients</h1>
        <p className="page-subtitle">{data?.count ?? 0} patient(s)</p>
      </div>

      <div className="card">
        {!data?.results.length ? (
          <div className="empty-state">No patients yet.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Clinic</th>
                  <th>Owner</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/app/patients/${p.id}`}>{p.name}</Link>
                    </td>
                    <td>{p.email}</td>
                    <td>{p.clinic_name}</td>
                    <td>{p.owner_therapist_name}</td>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
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
