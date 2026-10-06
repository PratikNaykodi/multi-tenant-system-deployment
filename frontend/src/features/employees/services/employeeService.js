import api from "../../../services/api";

/*
|--------------------------------------------------------------------------
| Get All Employees
|--------------------------------------------------------------------------
*/
export const getEmployees = async () => {
    const response = await api.get("/employees");
    return response.data;
};

/*
|--------------------------------------------------------------------------
| Get Single Employee
|--------------------------------------------------------------------------
*/
export const getEmployee = async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
};

/*
|--------------------------------------------------------------------------
| Create Employee
|--------------------------------------------------------------------------
*/
export const createEmployee = async (employeeData) => {
    const response = await api.post("/employees", employeeData);

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Update Employee
|--------------------------------------------------------------------------
*/
export const updateEmployee = async (id, employeeData
) => {
    const response = await api.put(`/employees/${id}`, employeeData);

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Delete Employee
|--------------------------------------------------------------------------
*/
export const deleteEmployee = async (id) => {
    const response = await api.delete(`/employees/${id}`);

    return response.data;
};
