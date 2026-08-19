# @openshift-migration-advisor/ioc

A lightweight Inversion of Control (IoC) container solution for React applications, inspired by InversifyJS.

## Installation

```bash
npm install @openshift-migration-advisor/ioc --save
```

or

```bash
yarn add @openshift-migration-advisor/ioc
```

## Usage

### 1. Define Symbols for Your Dependencies

Create a symbols file to define unique identifiers for your dependencies:

```typescript
// Symbols.ts
export const Symbols = Object.freeze({
  MyService: Symbol.for("MyService"),
  ApiClient: Symbol.for("ApiClient"),
});
```

### 2. Create and Configure the Container

Create a container instance and register your dependencies:

```typescript
import { Container } from "@openshift-migration-advisor/ioc";
import { Symbols } from "./Symbols";
import { MyService } from "./services/MyService";
import { ApiClient } from "./clients/ApiClient";

function getConfiguredContainer(): Container {
  const container = new Container();

  // Register dependencies
  container
    .register(Symbols.MyService, new MyService())
    .register(Symbols.ApiClient, new ApiClient());

  return container;
}
```

### 3. Provide the Container to Your App

Wrap your application with the `Provider` component:

```typescript
import { Provider } from "@openshift-migration-advisor/ioc";
import React from "react";
import ReactDOM from "react-dom/client";

const container = getConfiguredContainer();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider container={container}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

### 4. Use Dependencies in Components

Use the `useInjection` hook to retrieve dependencies in your React components:

```typescript
import { useInjection } from "@openshift-migration-advisor/ioc";
import { Symbols } from "./Symbols";
import type { MyServiceInterface } from "./services/MyService";

export const MyComponent: React.FC = () => {
  const myService = useInjection<MyServiceInterface>(Symbols.MyService);

  // Use the injected service
  const handleClick = () => {
    myService.doSomething();
  };

  return <button onClick={handleClick}>Click me</button>;
};
```

## API Reference

### `Container`

A singleton-scoped dependency injection container.

#### Methods

##### `register<T>(symbol: symbol, value: T): Container`

Registers a dependency with the container.

- **Parameters:**
  - `symbol`: A unique symbol identifier for the dependency
  - `value`: The value to register
- **Returns:** The container instance (for method chaining)

##### `get<T>(symbol: symbol): T | undefined`

Retrieves a registered dependency from the container.

- **Parameters:**
  - `symbol`: The symbol identifier of the dependency to retrieve
- **Returns:** The registered dependency value, or `undefined` if not registered.

### `Provider`

A React context provider component that makes the container available to child components.

#### Props

- `container: Container` - The container instance to provide
- `children: React.ReactNode` - Child components

### `useInjection<T>(symbol: symbol): T`

A React hook that retrieves a dependency from the container.

- **Parameters:**
  - `symbol`: The symbol identifier of the dependency to retrieve
- **Returns:** The registered dependency value
- **Throws:** `ReferenceError` if used outside a `Provider`

## Example

Here's a complete example demonstrating the full usage:

```typescript
// 1. Define symbols
export const Symbols = Object.freeze({
  UserApi: Symbol.for("UserApi"),
});

// 2. Create and configure container
import { Container, Provider } from "@openshift-migration-advisor/ioc";
import { UserApi } from "./api/UserApi";

const container = new Container();
container.register(Symbols.UserApi, new UserApi());

// 3. Provide container to app
function App() {
  return (
    <Provider container={container}>
      <UserProfile />
    </Provider>
  );
}

// 4. Use dependency in component
import { useInjection } from "@openshift-migration-advisor/ioc";

function UserProfile() {
  const userApi = useInjection(Symbols.UserApi);
  const [user, setUser] = useState(null);

  useEffect(() => {
    userApi.getUser().then(setUser);
  }, [userApi]);

  return <div>{user?.name}</div>;
}
```

## Features

- **Simple API**: Minimal surface area with just a few core concepts
- **Type-safe**: Full TypeScript support with generics
- **React-friendly**: Designed specifically for React applications
- **Lightweight**: No external dependencies beyond React
- **Singleton scope**: All dependencies are singleton-scoped

## Development

### Building

```bash
yarn build
```

### Code Quality

```bash
# Check code
yarn check

# Fix code issues
yarn check:fix

# Format code
yarn format
```

### Cleaning

```bash
yarn clean
```

## License

[Apache 2.0](LICENSE)
