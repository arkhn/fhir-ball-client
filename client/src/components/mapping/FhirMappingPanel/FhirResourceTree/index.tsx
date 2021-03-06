import { Spinner } from '@blueprintjs/core';
import { useApolloClient, useMutation } from '@apollo/react-hooks';
import { Classes, ITreeNode, Tree } from '@blueprintjs/core';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@apollo/react-hooks';
import { IReduxStore, IAttributeDefinition, IAttribute } from 'types';
import { loader } from 'graphql.macro';
import { useSnackbar } from 'notistack';

import { Attribute, ResourceDefinition } from '@arkhn/fhir.ts';

// ACTIONS
import { removeAttributesFromMap } from 'services/resourceAttributes/actions';
import { onError } from 'services/apollo';

import { TreeNode } from './treeNode';
// GRAPHQL
const qStructureDisplay = loader(
  'src/graphql/queries/structureDisplay.graphql'
);
const mDeleteAttributesStartingWith = loader(
  'src/graphql/mutations/deleteAttributesStartingWith.graphql'
);

const escapeRegExp = (str: string) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

export interface Props {
  onClickCallback: any;
}

const FhirResourceTree = ({ onClickCallback }: Props) => {
  const client = useApolloClient();
  const dispatch = useDispatch();

  const { enqueueSnackbar } = useSnackbar();
  const { resource, source, attribute: selectedAttribute } = useSelector(
    (state: IReduxStore) => state.selectedNode
  );
  const user = useSelector((state: IReduxStore) => state.user);
  const { extensions } = useSelector((state: IReduxStore) => state.fhir);
  const baseDefinitionId = resource.definition.id;

  const { data, loading } = useQuery(qStructureDisplay, {
    variables: { definitionId: baseDefinitionId }
  });

  const [deleteAttributes] = useMutation(mDeleteAttributesStartingWith, {
    onError: onError(enqueueSnackbar)
  });

  const [nodes, setNodes] = useState([] as TreeNode[]);
  const [selectedNode, setSelectedNode] = useState(
    undefined as TreeNode | undefined
  );

  const attributesForResource: { [k: string]: IAttribute } = useSelector(
    (state: IReduxStore) => state.resourceAttributes
  );
  const attributesWithInputs = Object.keys(attributesForResource).filter(path =>
    attributesForResource[path].inputGroups.some(
      group => group.inputs.length > 0
    )
  );

  const isAdmin = user && user.role === 'ADMIN';
  const isWriter =
    source &&
    source.accessControls.filter(
      acl => acl.role === 'WRITER' && acl.user.id === user.id
    ).length > 0;

  const buildAttributes = (parent?: Attribute) => ({
    attribute
  }: IAttributeDefinition): Attribute => {
    const a = Attribute.from(attribute, parent);

    if (a.isPrimitive)
      a.extensions = a.types.reduce(
        (acc: ResourceDefinition[], type: string) => [
          ...acc,
          ...(extensions[type] || [])
        ],
        []
      );
    else a.extensions = extensions[a.definition.id];
    return a;
  };

  const fhirStructure: Attribute[] =
    data && data.structureDefinition
      ? data.structureDefinition.attributes.map(buildAttributes())
      : [];
  const resourceExtensions = extensions[resource.definition.type] || [];

  const itemsOf = (array: Attribute): { [index: string]: IAttribute } => {
    // Check if there are already existing attributes for this node
    // we extract the index from the path
    const regex = new RegExp(`^${escapeRegExp(array.path)}\\[(\\d+)\\]$`);
    return Object.keys(attributesForResource)
      .filter(key => regex.test(key))
      .reduce(
        (acc: any, key: string) => ({
          ...acc,
          [regex.exec(key)![1]]: attributesForResource[key]
        }),
        {}
      );
  };

  const createNode = (
    attribute: Attribute,
    childNodes: TreeNode[],
    parentArray?: TreeNode
  ): TreeNode => {
    const node = new TreeNode(
      attribute,
      childNodes,
      resourceExtensions,
      addExtension,
      addNodeToArray,
      addSliceToArray,
      deleteNodeFromArray,
      genTreeLevel,
      parentArray
    );
    if (!!selectedAttribute && attribute.path === selectedAttribute.path) {
      node.isSelected = true;
      setSelectedNode(node);
    }
    return node;
  };

  const addExtension = async (
    node: TreeNode,
    extensionDefinition: ResourceDefinition
  ): Promise<void> => {
    // TODO: handle primitive extensions
    if (node.nodeData.isPrimitive) {
      enqueueSnackbar(
        'adding extensions to primitive types is not handled yet',
        { variant: 'error' }
      );
      return;
    }
    const isRootExtensions = !node.nodeData.parent && node.nodeData.isExtension;
    let extensionArrayNode = isRootExtensions
      ? node
      : node.childNodes!.find(child => child.nodeData!.isExtension);

    if (!extensionArrayNode) {
      const extAttr = node.nodeData.children.find(c => c.isExtension);
      extensionArrayNode = createNode(extAttr!, []);
      node.childNodes = [...node.childNodes!, extensionArrayNode];
    }

    const { data, errors } = await client.query({
      query: qStructureDisplay,
      variables: { definitionId: extensionDefinition.id }
    });
    if (!data) {
      console.error('could not add extension:', errors);
      return;
    }
    const extensionNode = (extensionArrayNode as TreeNode).addExtension(
      data.structureDefinition
    );

    node.isExpanded = true;
    extensionArrayNode.isExpanded = true;
    extensionNode!.isExpanded = true;
    if (selectedNode) selectedNode.isSelected = false;
    extensionNode!.isSelected = true;
    setSelectedNode(extensionNode);

    setNodes(nodes => [...nodes]);
  };

  const deleteNodeFromArray = (
    deletedNode: TreeNode,
    arrayNode: TreeNode
  ): void => {
    // First, we delete all the corresponding attributes in DB
    const deleted = deletedNode.nodeData!;
    deleteAttributes({
      variables: {
        startsWith: deleted.path
      }
    });
    // Same in Redux store
    dispatch(removeAttributesFromMap(deleted.path));
    // and remove the item in the parent attribute as well
    arrayNode.removeItem(deletedNode);
    //update the nodes in state
    setNodes(nodes => [...nodes]);
  };

  const addNodeToArray = (arrayNode: TreeNode) => {
    // add it to the parent
    arrayNode.addItem();
    setNodes(nodes => [...nodes]);
  };

  const addSliceToArray = (arrayNode: TreeNode, sliceName: string) => {
    arrayNode.addSlice(sliceName);
    setNodes(nodes => [...nodes]);
  };

  const buildChildNodesForArray = (arrayNode: TreeNode): TreeNode[] => {
    const array = arrayNode.nodeData!;

    let existingItems = itemsOf(array);
    // If no child exists yet, we still build one with index 0
    if (Object.keys(existingItems).length === 0) {
      if (array.isExtension) return [];
      existingItems = { '0': null as any };
    }
    // create a node for each item of the array
    return Object.keys(existingItems).map(index =>
      array.isExtension
        ? arrayNode.addExtension(
            {
              id: existingItems[index]?.definitionId,
              attributes: []
            },
            Number(index)
          )!
        : arrayNode.addItem(Number(index))
    );
  };

  const buildSlicedNode = (slicedNode: TreeNode): TreeNode[] => {
    const sliced = slicedNode.nodeData!;

    let existingItems = itemsOf(sliced);
    // create a node for each item of the array
    return Object.keys(existingItems).map(index =>
      slicedNode.addSlice(
        existingItems[index] ? existingItems[index].sliceName : undefined,
        Number(index)
      )
    );
  };

  const buildNodeFromAttribute = (attribute: Attribute): TreeNode | null => {
    const node = createNode(attribute, []);

    if (attribute.slices.length > 0) {
      // if the attribute has slices, we build a node with these different slices inside
      node.childNodes = buildSlicedNode(node);
    } else if (attribute.choices.length > 0) {
      // if the node has choices, create a node for each of them
      attribute.choices.forEach(choice => attribute.parent?.addChild(choice));
      node.childNodes = genTreeLevel(attribute.choices);
    } else if (attribute.isArray) {
      // if the node is an array of extensions (not at the root),
      // only render it if it already has children.
      if (
        attribute.isExtension &&
        attribute.parent &&
        Object.keys(itemsOf(attribute)).length === 0
      )
        return null;
      // If node is array, we need to replicate the root node for this type
      // childNode will be the node really having the structure defined by
      // the structure definition.
      node.childNodes = buildChildNodesForArray(node);
    } else if (attribute.children.length > 0) {
      // if the node has children we already know about, create them.
      node.childNodes = genTreeLevel(attribute.children);
    }

    return node;
  };

  // For source readers, we only want to display attributes that are filled
  const shoudlBeDisplayed = (pathString: string) =>
    isAdmin ||
    isWriter ||
    attributesWithInputs.some(el => el.startsWith(pathString));

  const genTreeLevel = (attributes: Attribute[]): TreeNode[] =>
    attributes
      .filter(attr => shoudlBeDisplayed(attr.path))
      .map(buildNodeFromAttribute)
      .filter(Boolean) as TreeNode[];

  const fetchAttributeDefinition = async (
    parent: Attribute
  ): Promise<Attribute[]> => {
    const { data } = await client.query({
      query: qStructureDisplay,
      variables: { definitionId: parent.types[0] }
    });
    if (!data || !data.structureDefinition) return [];
    return data.structureDefinition.attributes.map(buildAttributes(parent));
  };

  const handleNodeClick = async (node: ITreeNode<Attribute>): Promise<void> => {
    const attribute = node.nodeData!;
    console.debug(attribute.path, attribute);
    if (
      attribute.isArray ||
      !attribute.isPrimitive ||
      node.childNodes?.length
    ) {
      // if the node is of composite or array type, expand (or collapse) it
      node.isExpanded = !node.isExpanded;
      // if the node has no children yet, fetch the attributes definitions
      // and add them as children of the clicked node.
      if (
        !attribute.isArray &&
        (!node.childNodes || node.childNodes.length === 0)
      ) {
        const children = await fetchAttributeDefinition(attribute);
        node.childNodes = genTreeLevel(children);
      }
    } else {
      if (selectedNode && selectedNode !== node)
        selectedNode.isSelected = false;

      // select or deselect the node
      if (node.isSelected) {
        node.isSelected = false;
        setSelectedNode(undefined);
        onClickCallback(undefined);
      } else {
        node.isSelected = true;
        setSelectedNode(node as TreeNode);
        onClickCallback(node.nodeData);
      }
    }
    setNodes([...nodes]);
  };

  const handleContextMenu = async (
    node: ITreeNode<Attribute>
  ): Promise<void> => {
    const attribute = node.nodeData!;
    if (
      !attribute.isArray &&
      !attribute.isPrimitive &&
      (!node.childNodes || node.childNodes.length === 0)
    ) {
      const children = await fetchAttributeDefinition(attribute);
      children.forEach(child => attribute.addChild(child));
    }
    setNodes([...nodes]);
  };

  useEffect(() => {
    setNodes(nodes => {
      nodes.forEach(n => n.updateSecondaryLabel());
      return [...nodes];
    });
  }, [attributesForResource]);

  useEffect(() => {
    if (!loading) setNodes(genTreeLevel(fhirStructure));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, loading]);

  return loading ? (
    <Spinner />
  ) : (
    <Tree
      className={Classes.ELEVATION_0}
      contents={nodes}
      onNodeClick={handleNodeClick}
      onNodeContextMenu={handleContextMenu}
      onNodeCollapse={handleNodeClick}
      onNodeExpand={handleNodeClick}
    />
  );
};

export default FhirResourceTree;
