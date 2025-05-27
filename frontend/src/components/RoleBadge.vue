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
            type: String,
            required: true,
            validator: (value) => ["user", "admin"].includes(value),
        },
    },
    computed: {
        roleConfig() {
            const configs = {
                admin: {
                    text: "Admin",
                    badgeClass:
                        "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
                    iconClass: "w-3.5 h-3.5",
                    icon: "BriefcaseIcon",
                },
                user: {
                    text: "User",
                    badgeClass:
                        "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
                    iconClass: "w-3 h-3",
                    icon: "UserIcon",
                },
            };
            return configs[this.role] || configs.user;
        },
        displayText() {
            return this.roleConfig.text;
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
