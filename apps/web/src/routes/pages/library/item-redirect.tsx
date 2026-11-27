import { Navigate, useParams } from 'react-router';

/** `/i/:itemId` deep links open the viewer over the library. */
export function ItemRedirect() {
  const { itemId } = useParams();
  return <Navigate to={`/library?item=${itemId ?? ''}`} replace />;
}
