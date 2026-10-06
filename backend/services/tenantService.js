import centralApi from "../../../services/centralApi";

export const createTenant = async (tenantData) => {

    const response =
        await centralApi.post(
            "/tenants",
            tenantData
        );

    return response.data;
};