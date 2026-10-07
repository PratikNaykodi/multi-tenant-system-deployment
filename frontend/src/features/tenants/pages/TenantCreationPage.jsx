import { useState } from "react";
import { createTenant } from "../services/tenantService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";

function TenantCreationPage() {
    // ==================================================
    // Form Data
    // ==================================================
    const [formData, setFormData] = useState({
        name: "",
        domain: ""
    });

    // ==================================================
    // Loading State
    // ==================================================
    const [loading, setLoading] = useState(false);

    // ==================================================
    // Error State
    // ==================================================
    const [error, setError] = useState("");

    // ==================================================
    // Tenant Creation Result
    // ==================================================
    const [result, setResult] = useState(null);

    // ==================================================
    // Handle Input Change
    // ==================================================
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

    // ==================================================
    // Generate Production Tenant URL
    // ==================================================

    const getTenantApplicationUrl = (tenant) => {
        // ------------------------------------------
        // Prefer identifier returned by backend
        // ------------------------------------------
        let identifier = tenant?.identifier;

        // ------------------------------------------
        // Fallback
        // ------------------------------------------
        //
        // If identifier is not available,
        // convert:
        //
        // bb.local
        //
        // to:
        //
        // bb
        //

        if (!identifier && tenant?.domain) {

            identifier =
                tenant.domain
                    .replace(".local", "")
                    .replace(
                        ".mytenantdemo.site",
                        ""
                    )
                    .trim()
                    .toLowerCase();
        }

        // ------------------------------------------
        // Production URL
        // ------------------------------------------

        return `https://${identifier}.mytenantdemo.site`;
    };

    // ==================================================
    // Handle Submit
    // ==================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");

        setResult(null);

        // ------------------------------------------
        // Validation
        // ------------------------------------------

        if (
            !formData.name.trim() ||
            !formData.domain.trim()
        ) {

            setError(
                "Clinic name and domain are required."
            );

            return;
        }

        try {

            setLoading(true);

            // ------------------------------------------
            // Create Tenant
            // ------------------------------------------

            const data =
                await createTenant({

                    name:
                        formData.name.trim(),

                    domain:
                        formData.domain
                            .trim()
                            .toLowerCase()

                });

            // ------------------------------------------
            // Store Result
            // ------------------------------------------

            setResult(data);

            // ------------------------------------------
            // Reset Form
            // ------------------------------------------

            setFormData({
                name: "",
                domain: ""
            });

        } catch (error) {

            console.error(
                "Create tenant error:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Unable to create tenant."
            );

        } finally {

            setLoading(false);
        }
    };

    // ==================================================
    // Tenant Application URL
    // ==================================================
    const tenantApplicationUrl =
        result?.tenant
            ? getTenantApplicationUrl(
                result.tenant
            )
            : "";
    // ==================================================
    // Render
    // ==================================================

    return (
        <div className="central-page">
            <div className="central-card">
                {/* ======================================
                    Header
                ====================================== */}
                <div className="central-header">
                    <h1>
                        Create Tenant
                    </h1>
                    <p>
                        Create a new tenant application
                    </p>
                </div>

                {/* ======================================
                    Create Tenant Form
                ====================================== */}

                {!result && (
                    <form
                        onSubmit={handleSubmit}
                        className="central-form"
                    >
                        {/* ----------------------------------
                            Error
                        ---------------------------------- */}
                        {error && (

                            <div className="page-error">

                                {error}

                            </div>

                        )}
                        {/* ----------------------------------
                            Clinic Name
                        ---------------------------------- */}
                        <div className="form-group">

                            <label>
                                Clinic Name
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={
                                    formData.name
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter clinic name"
                                disabled={loading}
                            />
                        </div>
                        {/* ----------------------------------
                            Domain
                        ---------------------------------- */}

                        <div className="form-group">

                            <div className="domain-label-row">

                                <label htmlFor="domain">
                                    Domain
                                </label>

                                <span className="domain-help">
                                    <FontAwesomeIcon icon={faCircleInfo} />
                                    <span className="domain-tooltip">
                                        Enter only your domain name, for example
                                        <strong> bb</strong>.
                                        Your application URL will be
                                        <strong> https://bb.mytenantdemo.site</strong>.
                                    </span>

                                </span>

                            </div>

                            <div className="domain-input-wrapper">

                                <input
                                    id="domain"
                                    type="text"
                                    name="domain"
                                    value={formData.domain}
                                    onChange={handleChange}
                                    placeholder="Enter domain name"
                                    disabled={loading}
                                />

                                <span className="domain-suffix">
                                    .mytenantdemo.site
                                </span>

                            </div>

                        </div>
                        {/* ----------------------------------
                            Submit
                        ---------------------------------- */}
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

                {/* ======================================
                    Success
                ====================================== */}

                {result && (
                    <div className="tenant-success">
                        <h2>
                            Tenant Created Successfully
                        </h2>
                        {/* ----------------------------------
                            Tenant Details
                        ---------------------------------- */}
                        <div className="tenant-details">
                            <p>
                                <strong>
                                    Company:
                                </strong>

                                {" "}
                                {result.tenant.name}
                            </p>

                            <p>
                                <strong>
                                    Identifier:
                                </strong>
                                {" "}
                                {result.tenant.identifier}
                            </p>

                            <p>

                                <strong>
                                    Domain:
                                </strong>
                                {" "}
                                {result.tenant.domain}
                            </p>

                            <p>
                                <strong>
                                    Database:
                                </strong>
                                {" "}

                                {result.tenant.databaseName}
                            </p>
                        </div>
                        {/* ----------------------------------
                            Admin Login
                        ---------------------------------- */}

                        <div className="admin-details">
                            <h3>
                                Admin Login
                            </h3>

                            <p>
                                <strong>
                                    Username:
                                </strong>
                                {" "}
                                {result.admin.username}
                            </p>
                            <p>
                                <strong> Password:</strong>
                                {" "}
                                {result.admin.password}
                            </p>
                        </div>

                        {/* ----------------------------------
                            Tenant Application
                        ---------------------------------- */}

                        <div className="tenant-login">
                            <p>
                                <strong>
                                    Tenant Application:
                                </strong>
                            </p>
                            <a
                                href={
                                    tenantApplicationUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                            >{tenantApplicationUrl}
                            </a>
                        </div>

                        {/* ----------------------------------
                            Create Another Tenant
                        ---------------------------------- */}
                        <button
                            type="button"
                            className="primary-button"
                            onClick={() => {
                                setResult(null);
                                setError("");
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