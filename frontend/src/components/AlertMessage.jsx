export default function AlertMessage({ error, success }) {
    return <>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
    </>;
}
