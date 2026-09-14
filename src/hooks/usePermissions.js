import { useSelector } from "react-redux"
import { selectGroups, selectRoles } from "selectors/authenticate"
import _ from "lodash"

const usePermissions = () => {
  const userGroups = useSelector((state) => selectGroups(state)) || []
  const userRoles = useSelector((state) => selectRoles(state))

  const canEdit = (resource) =>
    userGroups.includes(resource?.group) ||
    !!_.intersection(userGroups, resource?.editGroups).length

  const canChangeGroups = (resource) => userGroups.includes(resource.group)

  const hasRole = (role) => userRoles.includes(role)

  return { canCreate: !!userGroups.length, canEdit, canChangeGroups, hasRole }
}

export default usePermissions
