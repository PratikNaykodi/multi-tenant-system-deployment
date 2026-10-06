import { AbilityBuilder, createMongoAbility } from "@casl/ability";

// --------------------------------------------------
// Create CASL Ability
// --------------------------------------------------
export const createAbility = (permissions) => {
    const {
        can,
        cannot,
        build
    } = new AbilityBuilder(createMongoAbility);

    // -----------------------------------------------
    // Convert database permissions to CASL rules
    // -----------------------------------------------
    permissions.forEach((permission) => {
        const [resource, action] = permission.name.split(".");

        if (!resource || !action) {
            return;
        }
        can(
            action,
            resource
        );
    });

    // -----------------------------------------------
    // Build ability
    // -----------------------------------------------
    return build();
};