import type {
  CapabilityStatusCapabilities,
  CredentialStatus,
  VcenterCredentials,
} from "@openshift-migration-advisor/agent-sdk";
import {
  getCapabilities,
  getCredentialStatus,
} from "../../credentials/credentialsApi";
import { agentApiSlice } from "./agentApiSlice";

interface PutCredentialsArg {
  vcenterCredentials: VcenterCredentials;
}

/**
 * vCenter credential endpoints. Credentials and capabilities both provide the
 * single `Credentials` tag, so putting or deleting credentials refetches both —
 * the connection status and the derived capability flags can never diverge.
 *
 * Both queries return `null` on a 404 (no credentials configured yet); the
 * `getCredentialStatus`/`getCapabilities` helpers own that mapping so it stays
 * in one place.
 */
export const credentialsEndpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
    getCredentials: build.query<CredentialStatus | null, void>({
      query: () => (sdk) => getCredentialStatus(sdk),
      providesTags: ["Credentials"],
    }),

    getCredentialCapabilities: build.query<
      CapabilityStatusCapabilities | null,
      void
    >({
      query: () => (sdk) => getCapabilities(sdk),
      providesTags: ["Credentials"],
    }),

    putCredentials: build.mutation<CredentialStatus, PutCredentialsArg>({
      query:
        ({ vcenterCredentials }) =>
        (sdk) =>
          sdk.putCredentials({ vcenterCredentials }),
      invalidatesTags: ["Credentials"],
    }),

    deleteCredentials: build.mutation<void, void>({
      query: () => async (sdk) => {
        await sdk.deleteCredentials();
      },
      invalidatesTags: ["Credentials"],
    }),
  }),
});

export const {
  useGetCredentialsQuery,
  useGetCredentialCapabilitiesQuery,
  usePutCredentialsMutation,
  useDeleteCredentialsMutation,
} = credentialsEndpoints;
