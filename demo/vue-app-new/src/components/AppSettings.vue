<script setup lang="ts">
import { Button, Card, Select, Tab, Tabs, Tag, TextField, Toggle } from "@toruslabs/vue-components";
import { ADAPTER_STATUS, CHAIN_NAMESPACES, ChainNamespaceType, log , getChainConfig} from "@web3auth/modal";
import { useWeb3Auth } from "@web3auth/modal/vue";
import { computed, InputHTMLAttributes, ref } from "vue";

import {
  chainConfigs,
  chainNamespaceOptions,
  clientIds,
  confirmationStrategyOptions,
  languageOptions,
  loginProviderOptions,
  networkOptions,
  SmartAccountOptions,
} from "../config";
import { formDataStore } from "../store/form";

const formData = formDataStore;

const { status, isConnected, isInitialized, connect } = useWeb3Auth();

const chainOptions = computed(() =>
  chainConfigs[formData.chainNamespace].map((chainId) => {
    const chainConfig = getChainConfig(formData.chainNamespace, chainId, clientIds[formData.network]);
    if (!chainConfig) {
      throw new Error(`Chain config not found for chainId: ${chainId}`);
    }
    return {
      name: `${chainId} ${chainConfig.displayName}`,
      value: chainId,
    };
  })
);

const adapterOptions = computed(() =>
  formData.chainNamespace === CHAIN_NAMESPACES.EIP155
    ? [
        { name: "coinbase-adapter", value: "coinbase" },
        // { name: "auth-adapter", value: "auth" },
        { name: "torus-evm-adapter", value: "torus-evm" },
        { name: "wallet-connect-v2-adapter", value: "wallet-connect-v2" },
        { name: "injected-adapters", value: "injected-evm" },
      ]
    : [
        { name: "torus-solana-adapter", value: "torus-solana" },
        { name: "wallet-connect-v2-adapter", value: "wallet-connect-v2" },
        { name: "injected-adapters", value: "injected-solana" },
      ]
);

const isDisplay = (_name: string): boolean => {
  return !isConnected.value;
};

const isDisabled = (name: string): boolean => {
  switch (name) {
    case "whiteLabelSettings":
      return !formData.whiteLabel.enable;

    case "walletServicePlugin":
      return formData.chainNamespace !== CHAIN_NAMESPACES.EIP155 && formData.chainNamespace !== CHAIN_NAMESPACES.SOLANA;

    case "nftCheckoutPlugin":
      return formData.chainNamespace !== CHAIN_NAMESPACES.EIP155;

    case "btnConnect":
      return !isInitialized.value;

    case "smartAccountType":
    case "bundlerUrl":
    case "paymasterUrl":
    case "useAAWithExternalWallet":
      return !formData.useAccountAbstractionProvider;

    case "accountAbstraction":
      return formData.chainNamespace !== CHAIN_NAMESPACES.EIP155;

    default: {
      return false;
    }
  }
};

const activeTab = ref(0);
const onTabChange = (index: number) => {
  activeTab.value = index;
};
const isActiveTab = (index: number) => activeTab.value === index;

const onChainNamespaceChange = (value: string) => {
  log.info("onChainNamespaceChange", value);
  formData.chain = chainConfigs[value as ChainNamespaceType][0];
  formData.adapters = [];
};
</script>

<template>
  <div v-if="isDisplay('form')" class="grid grid-cols-8 gap-0">
    <div class="col-span-0 sm:col-span-1 lg:col-span-2"></div>
    <Card class="h-auto p-4 sm:p-8 col-span-8 sm:col-span-6 lg:col-span-4 max-sm:!shadow-none max-sm:!border-0">
      <div class="text-2xl font-bold leading-tight text-center sm:text-3xl">{{ $t("app.greeting") }}</div>
      <div class="my-4 font-extrabold leading-tight text-center">
        <Tag v-bind="{ minWidth: 'inherit' }" :class="['uppercase', { '!bg-blue-400 text-white': status === ADAPTER_STATUS.READY }]">
          {{ status }}
        </Tag>
        &nbsp;
        <Tag v-bind="{ minWidth: 'inherit' }" :class="['uppercase', { '!bg-blue-400 text-white': isInitialized }]">
          {{ isInitialized ? "INITIALIZED" : "NOT_INITIALIZE_YET" }}
        </Tag>
      </div>
      <Tabs class="mb-4">
        <Tab variant="underline" :active="isActiveTab(0)" @click="onTabChange(0)">General</Tab>
        <Tab variant="underline" :active="isActiveTab(1)" @click="onTabChange(1)">WhiteLabel</Tab>
        <Tab variant="underline" :active="isActiveTab(2)" @click="onTabChange(2)">Login Provider</Tab>
        <Tab
          v-if="formData.chainNamespace === CHAIN_NAMESPACES.EIP155 || formData.chainNamespace === CHAIN_NAMESPACES.SOLANA"
          variant="underline"
          :active="isActiveTab(3)"
          @click="onTabChange(3)"
        >
          Wallet Plugin
        </Tab>
        <Tab v-if="formData.chainNamespace === CHAIN_NAMESPACES.EIP155" variant="underline" :active="isActiveTab(4)" @click="onTabChange(4)">
          NFT Checkout Plugin
        </Tab>
        <Tab v-if="formData.chainNamespace === CHAIN_NAMESPACES.EIP155" variant="underline" :active="isActiveTab(5)" @click="onTabChange(5)">
          Account Abstraction Provider
        </Tab>
      </Tabs>
      <Card v-if="isActiveTab(0)" class="grid grid-cols-1 gap-2 px-4 py-4" :shadow="false">
        <Select
          v-model="formData.network"
          data-testid="selectNetwork"
          :label="$t('app.network')"
          :aria-label="$t('app.network')"
          :placeholder="$t('app.network')"
          :options="networkOptions"
        />
        <Select
          v-model="formData.chainNamespace"
          data-testid="selectChainNamespace"
          :label="$t('app.chainNamespace')"
          :aria-label="$t('app.chainNamespace')"
          :placeholder="$t('app.chainNamespace')"
          :options="chainNamespaceOptions"
          @update:model-value="onChainNamespaceChange"
        />
        <Select
          v-model="formData.chain"
          data-testid="selectChain"
          :label="$t('app.chain')"
          :aria-label="$t('app.chain')"
          :placeholder="$t('app.chain')"
          :options="chainOptions"
        />
        <Select
          v-model="formData.adapters"
          data-testid="selectAdapters"
          :label="$t('app.adapters')"
          :aria-label="$t('app.adapters')"
          :placeholder="$t('app.adapters')"
          :options="adapterOptions"
          multiple
          :show-check-box="true"
        />
        <Toggle
          v-model="formData.showWalletDiscovery"
          data-testid="showWalletDiscovery"
          :show-label="true"
          :size="'small'"
          :label-disabled="$t('app.showWalletDiscovery')"
          :label-enabled="$t('app.showWalletDiscovery')"
          class="mb-2"
        />
      </Card>
      <Card v-if="isActiveTab(1)" class="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-2" :shadow="false">
        <Toggle
          v-model="formData.whiteLabel.enable"
          data-testid="whitelabel"
          :show-label="true"
          :size="'small'"
          :label-disabled="$t('app.whiteLabel.title')"
          :label-enabled="$t('app.whiteLabel.title')"
          class="mb-2"
        />
        <Toggle
          id="useLogoLoader"
          v-model="formData.whiteLabel.config.useLogoLoader"
          :show-label="true"
          :size="'small'"
          :label-disabled="$t('app.whiteLabel.useLogoLoader')"
          :label-enabled="$t('app.whiteLabel.useLogoLoader')"
          :disabled="isDisabled('whiteLabelSettings')"
        />
        <TextField
          v-model="formData.whiteLabel.config.appName"
          :label="$t('app.whiteLabel.appName')"
          :aria-label="$t('app.whiteLabel.appName')"
          :placeholder="$t('app.whiteLabel.appName')"
          :disabled="isDisabled('whiteLabelSettings')"
        />
        <Select
          v-model="formData.whiteLabel.config.defaultLanguage"
          :label="$t('app.whiteLabel.defaultLanguage')"
          :aria-label="$t('app.whiteLabel.defaultLanguage')"
          :placeholder="$t('app.whiteLabel.defaultLanguage')"
          :options="languageOptions"
          :disabled="isDisabled('whiteLabelSettings')"
        />
        <TextField
          v-model="formData.whiteLabel.config.appUrl"
          :label="$t('app.whiteLabel.appUrl')"
          :aria-label="$t('app.whiteLabel.appUrl')"
          :placeholder="$t('app.whiteLabel.appUrl')"
          :disabled="isDisabled('whiteLabelSettings')"
          class="col-span-2"
        />
        <TextField
          v-model="formData.whiteLabel.config.logoLight"
          :label="$t('app.whiteLabel.logoLight')"
          :aria-label="$t('app.whiteLabel.logoLight')"
          :placeholder="$t('app.whiteLabel.logoLight')"
          :disabled="isDisabled('whiteLabelSettings')"
        />
        <TextField
          v-model="formData.whiteLabel.config.logoDark"
          :label="$t('app.whiteLabel.logoDark')"
          :aria-label="$t('app.whiteLabel.logoDark')"
          :placeholder="$t('app.whiteLabel.logoDark')"
          :disabled="isDisabled('whiteLabelSettings')"
        />

        <TextField
          :model-value="formData.whiteLabel.config.theme?.primary"
          :label="$t('app.whiteLabel.primaryColor')"
          :aria-label="$t('app.whiteLabel.primaryColor')"
          :placeholder="$t('app.whiteLabel.primaryColor')"
          :disabled="isDisabled('whiteLabelSettings')"
        >
          <template #endIconSlot>
            <input
              id="primary-color-picker"
              class="color-picker"
              type="color"
              :value="formData.whiteLabel.config.theme?.primary"
              @input="
                (e) => {
                  const color = (e.target as InputHTMLAttributes).value;
                  formData.whiteLabel.config.theme = { ...formData.whiteLabel.config.theme, primary: color };
                }
              "
            />
          </template>
        </TextField>
        <TextField
          :model-value="formData.whiteLabel.config.theme?.onPrimary"
          :label="$t('app.whiteLabel.onPrimaryColor')"
          :aria-label="$t('app.whiteLabel.onPrimaryColor')"
          :placeholder="$t('app.whiteLabel.onPrimaryColor')"
          :disabled="isDisabled('whiteLabelSettings')"
        >
          <template #endIconSlot>
            <input
              id="primary-color-picker"
              class="color-picker"
              type="color"
              :value="formData.whiteLabel.config.theme?.onPrimary"
              @input="
                (e) => {
                  const color = (e.target as InputHTMLAttributes).value;
                  formData.whiteLabel.config.theme = { ...formData.whiteLabel.config.theme, onPrimary: color };
                }
              "
            />
          </template>
        </TextField>
      </Card>
      <Card v-if="isActiveTab(2)" class="grid grid-cols-1 gap-2 px-4 py-4" :shadow="false">
        <Select
          v-model="formData.loginProviders"
          data-testid="selectLoginProviders"
          :label="$t('app.loginProviders')"
          :aria-label="$t('app.loginProviders')"
          :placeholder="$t('app.loginProviders')"
          :options="loginProviderOptions"
          multiple
          class=""
        />
        <Card v-for="p in formData.loginProviders" :key="p" :shadow="false" class="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-3">
          <div class="font-bold leading-tight text-left sm:col-span-2">{{ p }}</div>
          <Toggle
            v-model="formData.loginMethods[p].mainOption"
            :show-label="true"
            :size="'small'"
            :label-disabled="$t('app.loginMethod.mainOption')"
            :label-enabled="$t('app.loginMethod.mainOption')"
          />
          <TextField
            v-model="formData.loginMethods[p].name"
            :label="$t('app.loginMethod.name')"
            :aria-label="$t('app.loginMethod.name')"
            :placeholder="$t('app.loginMethod.name')"
          />
          <TextField
            v-model="formData.loginMethods[p].description"
            :label="$t('app.loginMethod.description')"
            :aria-label="$t('app.loginMethod.description')"
            :placeholder="$t('app.loginMethod.description')"
            class="sm:col-span-2"
          />
          <TextField
            v-model="formData.loginMethods[p].logoHover"
            :label="$t('app.loginMethod.logoHover')"
            :aria-label="$t('app.loginMethod.logoHover')"
            :placeholder="$t('app.loginMethod.logoHover')"
          />
          <TextField
            v-model="formData.loginMethods[p].logoLight"
            :label="$t('app.loginMethod.logoLight')"
            :aria-label="$t('app.loginMethod.logoLight')"
            :placeholder="$t('app.loginMethod.logoLight')"
          />
          <TextField
            v-model="formData.loginMethods[p].logoDark"
            :label="$t('app.loginMethod.logoDark')"
            :aria-label="$t('app.loginMethod.logoDark')"
            :placeholder="$t('app.loginMethod.logoDark')"
          />
          <Toggle
            v-model="formData.loginMethods[p].showOnModal"
            :show-label="true"
            :size="'small'"
            :label-disabled="$t('app.loginMethod.showOnModal')"
            :label-enabled="$t('app.loginMethod.showOnModal')"
          />
          <Toggle
            v-model="formData.loginMethods[p].showOnDesktop"
            :show-label="true"
            :size="'small'"
            :label-disabled="$t('app.loginMethod.showOnDesktop')"
            :label-enabled="$t('app.loginMethod.showOnDesktop')"
          />
          <Toggle
            v-model="formData.loginMethods[p].showOnMobile"
            :show-label="true"
            :size="'small'"
            :label-disabled="$t('app.loginMethod.showOnMobile')"
            :label-enabled="$t('app.loginMethod.showOnMobile')"
          />
        </Card>
      </Card>
      <Card v-if="isActiveTab(3)" class="grid grid-cols-1 gap-2 px-4 py-4" :shadow="false">
        <Toggle
          v-model="formData.walletPlugin.enable"
          :disabled="isDisabled('walletServicePlugin')"
          :show-label="true"
          :size="'small'"
          :label-disabled="$t('app.walletPlugin.title')"
          :label-enabled="$t('app.walletPlugin.title')"
          class="mb-2"
        />
        <TextField
          v-model="formData.walletPlugin.logoLight"
          :label="$t('app.walletPlugin.logoLight')"
          :disabled="isDisabled('walletServicePlugin')"
          :aria-label="$t('app.walletPlugin.logoLight')"
          :placeholder="$t('app.walletPlugin.logoLight')"
          class="sm:col-span-2"
        />
        <TextField
          v-model="formData.walletPlugin.logoDark"
          :disabled="isDisabled('walletServicePlugin')"
          :label="$t('app.walletPlugin.logoDark')"
          :aria-label="$t('app.walletPlugin.logoDark')"
          :placeholder="$t('app.walletPlugin.logoDark')"
          class="sm:col-span-2"
        />
        <Select
          v-model="formData.walletPlugin.confirmationStrategy"
          data-testid="selectLoginProviders"
          :label="$t('app.walletPlugin.confirmationStrategy')"
          :aria-label="$t('app.walletPlugin.confirmationStrategy')"
          :placeholder="$t('app.walletPlugin.confirmationStrategy')"
          :options="confirmationStrategyOptions"
          class=""
        />
      </Card>
      <Card v-if="isActiveTab(4)" class="grid grid-cols-1 gap-2 px-4 py-4" :shadow="false">
        <Toggle
          v-model="formData.nftCheckoutPlugin.enable"
          :disabled="isDisabled('nftCheckoutPlugin')"
          :show-label="true"
          :size="'small'"
          :label-disabled="$t('app.nftCheckoutPlugin.title')"
          :label-enabled="$t('app.nftCheckoutPlugin.title')"
          class="mb-2"
        />
      </Card>
      <Card v-if="isActiveTab(5)" class="grid grid-cols-1 gap-2 px-4 py-4" :shadow="false">
        <Toggle
          v-model="formData.useAccountAbstractionProvider"
          data-testid="accountAbstractionProvider"
          :show-label="true"
          :size="'small'"
          :label-disabled="$t('app.accountAbstractionProvider.title')"
          :label-enabled="$t('app.accountAbstractionProvider.title')"
          class="my-2"
        />
        <Toggle
          v-model="formData.useAAWithExternalWallet"
          data-testid="useAAWithExternalWallet"
          :show-label="true"
          :size="'small'"
          :label-disabled="$t('app.accountAbstractionProvider.useAAWithExternalWallet')"
          :label-enabled="$t('app.accountAbstractionProvider.useAAWithExternalWallet')"
          class="my-2"
          :disabled="isDisabled('useAAWithExternalWallet')"
        />
        <Select
          v-model="formData.smartAccountType"
          data-testid="smartAccountType"
          :label="$t('app.accountAbstractionProvider.smartAccountType')"
          :aria-label="$t('app.accountAbstractionProvider.smartAccountType')"
          :placeholder="$t('app.accountAbstractionProvider.smartAccountType')"
          :options="SmartAccountOptions"
          :disabled="isDisabled('smartAccountType')"
        />
        <TextField
          v-model="formData.bundlerUrl"
          :label="$t('app.accountAbstractionProvider.bundlerUrl')"
          :aria-label="$t('app.accountAbstractionProvider.bundlerUrl')"
          :placeholder="$t('app.accountAbstractionProvider.bundlerUrl')"
          :disabled="isDisabled('bundlerUrl')"
        />
        <TextField
          v-model="formData.paymasterUrl"
          :label="$t('app.accountAbstractionProvider.paymasterUrl')"
          :aria-label="$t('app.accountAbstractionProvider.paymasterUrl')"
          :placeholder="$t('app.accountAbstractionProvider.paymasterUrl')"
          :disabled="isDisabled('paymasterUrl')"
        />
      </Card>
      <div class="flex justify-center mt-5">
        <Button
          :class="['w-full !h-auto group py-3 rounded-full flex items-center justify-center']"
          data-testid="loginButton"
          type="button"
          block
          size="md"
          pill
          :disabled="isDisabled('btnConnect')"
          @click="connect"
        >
          Connect
        </Button>
      </div>
      <div class="px-0 mt-4 mb-5 text-sm font-normal text-app-gray-900 dark:text-app-gray-200">
        Reach out to us at
        <a class="underline text-app-primary-600 dark:text-app-primary-500" href="mailto:hello@tor.us">hello@tor.us</a>
        or
        <a class="underline text-app-primary-600 dark:text-app-primary-500" href="https://t.me/torusdev">telegram group</a>
        .
      </div>
    </Card>
  </div>
</template>
