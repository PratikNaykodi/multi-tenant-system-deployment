
import { useMemo, useState } from "react";
import { tenantApi } from "../../../services/tenantService.js";
import InfoIcon from "../../../components/InfoIcon.jsx";
import { getApiError } from "../../../utils/errors.js";
import { getTenantLoginUrl } from "../../../utils/tenant.js";

export default function TenantCreationPage() {
    const [name, setName] = useState("");
    const [identifier, setIdentifier] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    const preview = useMemo(
        () =>
            identifier
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-"),
        [identifier]
    );

    async function submit(e) {
        e.preventDefault();
        setError("");
        setResult(null);
        setBusy(true);

        try {
            const domain = `${preview}.mytenantdemo.site`;

            const response = await tenantApi.create({
                name: name.trim(),
                domain,
                identifier: preview,
            });

            setResult(response.data);
        } catch (e) {
            setError(getApiError(e));
        } finally {
            setBusy(false);
        }
    }

    if (result) {
        return <TenantSuccess result={result} />;
    }

    return (
        <div className="central-page">
            <div className="tenant-create-card">
                <h1>Create Tenant</h1>
                <p>Create a new tenant application</p>

                {error && (
                    <div className="alert alert-danger">{error}</div>
                )}

                <form onSubmit={submit}>
                    <label>Clinic Name</label>
                    <input
                        className="form-control big-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter clinic name"
                        required
                    />

                    <label className="mt-4">
                        Domain{" "}
                        <InfoIcon title="Use lowercase letters, numbers and hyphens. This becomes the tenant subdomain." />
                    </label>

                    <div className="domain-input">
                        <input
                            className="form-control big-input"
                            value={identifier}
                            onChange={(e) =>
                                setIdentifier(e.target.value.toLowerCase())
                            }
                            placeholder="Enter domain name"
                            required
                            pattern="[a-z0-9-]+"
                        />
                        <span>.mytenantdemo.site</span>
                    </div>

                    {preview && (
                        <div className="domain-preview">
                            Tenant URL:{" "}
                            <strong>
                                https://{preview}.mytenantdemo.site/login
                            </strong>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="primary-btn w-100 mt-4"
                        disabled={busy}
                    >
                        {busy ? "Creating Tenant..." : "Create Tenant"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function TenantSuccess({ result }) {
    const tenant = result?.tenant || {};
    const admin = result?.admin || {};

    const identifier =
        tenant.identifier ||
        tenant.domain?.split(".")[0] ||
        "tenant";

    const loginUrl = tenant.domain?.includes(".")
        ? `https://${tenant.domain}/login`
        : getTenantLoginUrl(identifier);

    return (
        <div className="central-page">
            <div className="tenant-success-card">
                <div className="success-check">✓</div>

                <h1>Tenant Created Successfully</h1>
                <p>Your tenant application is ready.</p>

                <div className="details-grid">
                    <Detail label="Clinic Name" value={tenant.name} />
                    <Detail label="Tenant ID" value={tenant.id} />
                    <Detail label="Identifier" value={tenant.identifier} />
                    <Detail
                        label="Database"
                        value={tenant.databaseName || tenant.database_name}
                    />
                    <Detail label="Tenant Domain" value={tenant.domain} />
                    <Detail label="Login URL" value={loginUrl} />
                </div>

                <div className="demo-box">
                    <h3>Login Credential</h3>

                    <Detail
                        label="Username"
                        value={admin.username || admin.email}
                    />

                    <Detail
                        label="Password"
                        value={admin.password}
                    />
                </div>

                <div className="success-actions">
                    <a className="primary-btn" href={loginUrl}>
                        Open Tenant Login
                    </a>

                    <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => window.location.reload()}
                    >
                        Create Another Tenant
                    </button>
                </div>
            </div>
        </div>
    );
}

function Detail({ label, value }) {
    return (
        <div className="detail-row">
            <span>{label}</span>
            <strong>{value ?? "-"}</strong>
        </div>
    );
}
