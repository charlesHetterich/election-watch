import { ConfigType, Configuration } from ".";

export enum Permissions {
    Transact = "transact",
    WriteFile = "write-file",
}
export type TPermission = `${Permissions}`;

export type PermissionConfiguration<T extends TPermission = TPermission> =
    Configuration<ConfigType.Permission> & {
        readonly permission: T;
    };

export function Permission<P extends TPermission>(
    restrictiveId: P
): PermissionConfiguration<P> {
    return {
        configType: ConfigType.Permission,
        permission: restrictiveId,
    };
}
