import { useState } from "react";
import { createTenant } from "../services/tenantService";

function TenantCreationPage() {
    const [formData, setFormData] = useState({
                                        name: "",
                                        domain: ""
                                    });

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [result, setResult] = useState(null);

    const handleChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setFormData(
            (previous) => ({
                ...previous,
                [name]: value
            })
        );
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setResult(null);

        if (
            !formData.name.trim() ||
            !formData.domain.trim()
        ) {
            setError("Company name and domain are required.");
            return;
        }

        try {
            setLoading(true);

            const data =
                await createTenant({
                    name: formData.name.trim(),
                    domain: formData.domain
                            .trim()
                            .toLowerCase()
                });

            setResult(data);

            setFormData({
                name: "",
                domain: ""
            });

        } catch (error) {
            console.error("Create tenant error:", error);

            setError(
                error.response?.data?.message ||
                "Unable to create tenant."
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="central-page">
            <div className="central-card">
                <div className="central-header">
                    <h1>Create Tenant</h1>
                    <p>Create a new tenant application</p>
                </div>

                {!result && (
                    <form onSubmit={handleSubmit} className="central-form">
                        {error && (
                            <div className="page-error">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Company Name</label>
                            <input
                                type="text"
                                name="name"
                                value={
                                    formData.name
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="ABC Company"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>Domain</label>
                            <input
                                type="text"
                                name="domain"
                                value={
                                    formData.domain
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="abc.local"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Creating Tenant..."
                                : "Create Tenant"
                            }
                        </button>
                    </form>
                )}

                {result && (
                    <div className="tenant-success">
                        <h2>Tenant Created Successfully</h2>

                        <div className="tenant-details">
                            <p>
                                <strong>Company:</strong>
                                {" "}
                                {result.tenant.name}
                            </p>

                            <p>
                                <strong>Domain:</strong>
                                {" "}
                                {result.tenant.domain}
                            </p>

                            <p>
                                <strong>Database:</strong>
                                {" "}
                                {result.tenant.databaseName}
                            </p>
                        </div>

                        <div className="admin-details">
                            <h3>Demo Admin Login</h3>

                            <p>
                                <strong>Username:</strong>
                                {" "}
                                {result.admin.username}
                            </p>
                            <p>
                                <strong>Password:</strong>
                                {" "}
                                {result.admin.password}
                            </p>
                        </div>

                        <div className="tenant-login">
                            <p>Tenant Application:</p>
                            <a href={`http://${result.tenant.domain}:5173`}>
                                http://{result.tenant.domain}:5173
                            </a>
                        </div>

                        <button className="primary-button"
                            onClick={() => {
                                setResult(null);
                            }}
                        >Create Another Tenant
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TenantCreationPage;