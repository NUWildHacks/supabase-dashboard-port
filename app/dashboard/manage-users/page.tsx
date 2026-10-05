import { redirect } from "next/navigation";

import { ADMIN, DASHBOARD_PATH, DASHBOARD_MANAGE_USERS_PATH, LOGIN_PATH, JUDGE, JUDGE_AND_MENTOR } from "@/constants";
import { getAuthenticatedUser } from "@/lib/server";

import { JudgingAssignmentsTable, UsersTable } from "./_components";
import { getJudgingAssignmentsMap, getProjectsMap, getUsers } from "./_lib";

const ManageUsersPage = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_MANAGE_USERS_PATH)}`;

  const { role, id } = await getAuthenticatedUser(redirectPath);
  if (role !== ADMIN) redirect(DASHBOARD_PATH);

  const [users, judgingAssignmentsMap, projectsMap] = await Promise.all([
    getUsers(),
    getJudgingAssignmentsMap(),
    getProjectsMap(),
  ]);

  const judges = users.filter((user) => user.role === JUDGE || user.role === JUDGE_AND_MENTOR);

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-md font-semibold">Users</h2>
        <UsersTable userId={id} users={users} />
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-md font-semibold">Judging Assignments</h2>
        <JudgingAssignmentsTable
          judgingAssignmentsMap={judgingAssignmentsMap}
          projectsMap={projectsMap}
          judges={judges}
        />
      </div>
    </div>
  );
};

export default ManageUsersPage;
