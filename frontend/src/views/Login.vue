<template>
    <div
        class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4"
    >
        <!-- Top Logo -->
        <div class="absolute top-6 left-6">
            <AppLogo />
        </div>

        <!-- Dark Mode Toggle -->
        <div class="absolute top-6 right-6">
            <DarkModeToggle />
        </div>

        <div class="w-full max-w-md">
            <!-- Card -->
            <div
                class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
            >
                <!-- Header -->
                <div class="text-center mb-8">
                    <h1
                        class="text-3xl font-bold text-gray-800 dark:text-white mb-2"
                    >
                        Sign In
                    </h1>
                    <p class="text-gray-600 dark:text-gray-400">
                        Sign in to your account
                    </p>
                </div>

                <!-- Form -->
                <form @submit.prevent="handleLogin" class="space-y-6">
                    <!-- Identity Field -->
                    <BaseInput
                        id="identity"
                        v-model="form.identity"
                        label="Email or Username"
                        type="text"
                        placeholder="Enter your email or username"
                        required
                        :disabled="loading"
                    />

                    <!-- Password Field -->
                    <PasswordInput
                        id="password"
                        v-model="form.password"
                        label="Password"
                        placeholder="Enter your password"
                        required
                        :disabled="loading"
                    />

                    <!-- Error Message -->
                    <div
                        v-if="error"
                        class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                        <p class="text-sm text-red-700 dark:text-red-400">
                            {{ error }}
                        </p>
                    </div>

                    <!-- Submit Button -->
                    <RippleEffect :disabled="loading" color="rgba(255, 255, 255, 0.3)">
                        <button
                            type="submit"
                            :disabled="loading"
                            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
                        >
                            <span
                                v-if="loading"
                                class="flex items-center justify-center"
                            >
                                <SpinnerIcon />
                                Signing in...
                            </span>
                            <span v-else>Login</span>
                        </button>
                    </RippleEffect>
                </form>

                <!-- Footer -->
                <div class="mt-6 text-center">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Secure authentication powered by Proxmox Panel
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from "../utils/api.js";
import BaseInput from "../components/BaseInput.vue";
import PasswordInput from "../components/PasswordInput.vue";
import SpinnerIcon from "../components/icons/SpinnerIcon.vue";
import DarkModeToggle from "../components/DarkModeToggle.vue";
import AppLogo from "../components/AppLogo.vue";
import RippleEffect from "../components/RippleEffect.vue";

export default {
    name: "Login",
    components: {
        BaseInput,
        PasswordInput,
        SpinnerIcon,
        DarkModeToggle,
        AppLogo,
        RippleEffect,
    },
    setup() {
        const router = useRouter();
        const loading = ref(false);
        const error = ref("");

        const form = ref({
            identity: "",
            password: "",
        });

        // Check if already authenticated
        onMounted(() => {
            if (api.isAuthenticated()) {
                router.push("/dashboard");
            }

            // Dark mode is already initialized in main.js
        });

        const handleLogin = async () => {
            loading.value = true;
            error.value = "";

            try {
                const response = await api.login(
                    form.value.identity,
                    form.value.password,
                );

                if (response.success) {
                    router.push("/dashboard");
                } else {
                    error.value = response.message || "Login failed";
                }
            } catch (err) {
                error.value = err.message || "Login failed. Please try again.";
            } finally {
                loading.value = false;
            }
        };

        return {
            form,
            loading,
            error,
            handleLogin,
        };
    },
};
</script>
