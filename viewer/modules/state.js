/**
 * UI State Management Module
 * 管理全局状态变量
 */

// 全局状态
export const state = {
  allRequests: [],
  filteredRequests: [],
  selectedRequest: null,
  selectedStatusCodes: new Set(),
  selectedMethods: new Set(),
  selectedRules: new Set(),
  showSlowRequestsOnly: false,
  searchScopes: new Set(['url'])
};

// 状态更新函数
export function updateAllRequests(requests) {
  state.allRequests = requests;
  state.filteredRequests = [...requests];
}

export function updateFilteredRequests(requests) {
  state.filteredRequests = requests;
}

export function selectRequest(request) {
  state.selectedRequest = request;
}

export function clearState() {
  state.allRequests = [];
  state.filteredRequests = [];
  state.selectedRequest = null;
}

export function toggleStatusCode(code) {
  if (state.selectedStatusCodes.has(code)) {
    state.selectedStatusCodes.delete(code);
  } else {
    state.selectedStatusCodes.add(code);
  }
}

export function clearStatusCodes() {
  state.selectedStatusCodes.clear();
}

export function toggleMethod(method) {
  if (state.selectedMethods.has(method)) {
    state.selectedMethods.delete(method);
  } else {
    state.selectedMethods.add(method);
  }
}

export function clearMethods() {
  state.selectedMethods.clear();
}

export function toggleRule(ruleId) {
  if (state.selectedRules.has(ruleId)) {
    state.selectedRules.delete(ruleId);
  } else {
    state.selectedRules.add(ruleId);
  }
}

export function clearRules() {
  state.selectedRules.clear();
}

export function toggleSlowRequestsOnly() {
  state.showSlowRequestsOnly = !state.showSlowRequestsOnly;
  return state.showSlowRequestsOnly;
}

export function toggleSearchScope(scope) {
  if (state.searchScopes.has(scope)) {
    state.searchScopes.delete(scope);
  } else {
    state.searchScopes.add(scope);
  }
}
