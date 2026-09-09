import useAuthenticateStore from "stores/authenticateStore"
import _ from "lodash"

const usePermissions = () => {
  const userGroups = useAuthenticateStore((state) => state.user?.groups) || []

  const canEdit = (resource) =>
    userGroups.includes(resource?.group) ||
    !!_.intersection(userGroups, resource?.editGroups).length

  const canChangeGroups = (resource) => userGroups.includes(resource.group)

  return { canCreate: !!userGroups.length, canEdit, canChangeGroups }
}

export default usePermissions
