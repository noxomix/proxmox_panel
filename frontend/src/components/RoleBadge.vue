<template>
    <span
        :class="badgeClasses"
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200"
    >
        <component :is="roleIcon" :className="iconClasses" class="mr-1" />
        {{ displayText }}
    </span>
</template>

<script>
import BriefcaseIcon from "./icons/BriefcaseIcon.vue";
import UserIcon from "./icons/UserIcon.vue";

export default {
    name: "RoleBadge",
    components: {
        BriefcaseIcon,
        UserIcon,
    },
    props: {
        role: {
            type: [String, Object],
            required: false,
            default: null,
        },
    },
    computed: {
        roleName() {
            if (!this.role) return null;
            if (typeof this.role === 'string') return this.role;
            return this.role.name || this.role.role_name;
        },
        displayName() {
            if (!this.role) return 'No Role';
            if (typeof this.role === 'string') return this.role;
            return this.role.display_name || this.role.role_display_name || this.role.name || this.role.role_name || 'Unknown Role';
        },
        roleConfig() {
            const roleName = this.roleName;
            const configs = {
                admin: {
                    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
                    iconClass: "w-3.5 h-3.5",
                    icon: "BriefcaseIcon",
                },
                customer: {
                    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
                    iconClass: "w-3 h-3",
                    icon: "UserIcon",
                },
                user: {
                    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
                    iconClass: "w-3 h-3",
                    icon: "UserIcon",
                },
                default: {
                    badgeClass: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
                    iconClass: "w-3 h-3",
                    icon: "UserIcon",
                }
            };
            return configs[roleName] || configs.default;
        },
        displayText() {
            return this.displayName;
        },
        badgeClasses() {
            return this.roleConfig.badgeClass;
        },
        iconClasses() {
            return this.roleConfig.iconClass;
        },
        roleIcon() {
            return this.roleConfig.icon;
        },
    },
};
</script>
