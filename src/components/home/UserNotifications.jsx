// Copyright 2021 Stanford University see LICENSE for license

import React from "react"
import useAuthenticateStore from "stores/authenticateStore"

const UserNotifications = () => {
  const user = useAuthenticateStore((state) => state.user)
  const userGroups = user?.groups

  if (!user) return null
  if (userGroups.length) return null

  if (!userGroups.length) {
    return (
      <div className="alert alert-warning">
        <strong>Note:</strong> Before you can create new resources or edit
        existing resources, the Sinopia administrator will need to add you to a
        permission group. Please contact&nbsp;
        <a href="mailto:sinopia_admin@stanford.edu">
          sinopia_admin@stanford.edu
        </a>
        &nbsp; to request edit permission.
      </div>
    )
  }
}
export default UserNotifications
