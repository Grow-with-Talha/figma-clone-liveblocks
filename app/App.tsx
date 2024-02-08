"use client";
import { fabric } from "fabric";
import LeftSideBar from "@/components/LeftSidebar";
import NavBar from "@/components/Navbar";
import RightSideBar from "@/components/RightSideBar";
import Live from "@/components/live";
import { ActiveElement, Attributes, CustomFabricObject } from "@/types/type";
import { useEffect, useRef, useState } from "react";
import {
  handleCanvasMouseDown,
  handleCanvasMouseUp,
  handleCanvasObjectModified,
  handleCanvasObjectScaling,
  handleCanvasSelectionCreated,
  handleCanvaseMouseMove,
  handlePathCreated,
  handleResize,
  initializeFabric,
  renderCanvas,
} from "@/lib/canvas";
import { useMutation, useRedo, useStorage, useUndo } from "@/liveblocks.config";
import { defaultNavElement } from "@/constants";
import { handleDelete, handleKeyDown } from "@/lib/key-events";
import { handleImageUpload } from "@/lib/shapes";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isDrawing = useRef(false);
  const shapeRef = useRef<fabric.Object | null>(null);
  const selectedShapeRef = useRef<string | null>(null);
  const activeObjectRef = useRef<fabric.Object | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false)
  const [elementAttributes, setElementAttributes] = useState<Attributes>({
    width: "",
    height: "",
    fontSize: "",
    fontFamily: "",
    fontWeight: "",
    fill: "#aabbcc",
    stroke: "#aabbcc"
  })
  // undo redo
  const undo = useUndo();
  const redo = useRedo();

  const canvasObjects = useStorage((root) => root.canvasObjects);
  const syncShapeInStorage = useMutation(({ storage }, object) => {
    if (!object) return;

    const { objectId } = object;
    const shapeData = object.toJSON();
    shapeData.objectId = objectId;
    const canvasObjects = storage.get("canvasObjects");
    canvasObjects.set(objectId, shapeData);
  }, []);

  const [activeElement, setActiveElement] = useState<ActiveElement>({
    name: "",
    value: "",
    icon: "",
  });
  const deleteAllShapes = useMutation(({ storage }) => {
    const canvasObjects = storage.get("canvasObjects");

    if (!canvasObjects || canvasObjects.size === 0) return true;

    for (const [key, value] of canvasObjects.entries()) {
      canvasObjects.delete(key);
    }
    return canvasObjects.size === 0;
  }, []);
  const deleteShapeFromStorage = useMutation(({ storage }, objectId) => {
    const canvasObjects = storage.get("canvasObjects");
    canvasObjects.delete(objectId);
  }, []);
  const handleActiveElement = (elem: ActiveElement) => {
    setActiveElement(elem);
    switch (elem?.value) {
      case "reset":
        deleteAllShapes();
        fabricRef.current?.clear();
        setActiveElement(defaultNavElement);
        break;
      case "delete":
        handleDelete(fabricRef.current as any, deleteShapeFromStorage);
        setActiveElement(defaultNavElement);
        break;
      case "image":
        imageInputRef.current?.click();
        isDrawing.current = false;

        if (fabricRef.current) {
          fabricRef.current.isDrawingMode = false;
        }
        break;
      default:
        break;
    }
    selectedShapeRef.current = elem?.value as string;
  };
  useEffect(() => {
    const canvas = initializeFabric({ canvasRef, fabricRef });

    canvas.on("mouse:down", (options) => {
      handleCanvasMouseDown({
        options,
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef,
      });
    });
    canvas.on("mouse:move", (options) => {
      handleCanvaseMouseMove({
        options,
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef,
        syncShapeInStorage,
      });
    });
    canvas.on("mouse:up", (options) => {
      handleCanvasMouseUp({
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef,
        syncShapeInStorage,
        setActiveElement,
        activeObjectRef,
      });
    });
    canvas.on("object:modified", (options) => {
      handleCanvasObjectModified({
        options,
        syncShapeInStorage,
      });
    });
    canvas.on("selection:created", (options) => {
      handleCanvasSelectionCreated({
        options,
        isEditingRef,
        setElementAttributes
      })
    })
    canvas.on("path:created", (options) => {
      handlePathCreated({
        options,
        syncShapeInStorage
      })
    })

    canvas.on("object:scaling", (options) => {
      handleCanvasObjectScaling({
        options, 
        setElementAttributes,
        
      })
    })
    window.addEventListener("resize", () => {
      handleResize({ canvas: fabricRef as any });
    });

    window.addEventListener("keydown", (e) => {
      handleKeyDown({
        e,
        canvas: fabricRef.current as any,
        undo,
        redo,
        syncShapeInStorage,
        deleteShapeFromStorage,
      });
    });
    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    renderCanvas({
      fabricRef,
      canvasObjects,
      activeObjectRef,
    });
  }, [canvasObjects]);
  return (
    <main className="h-screen overflow-hidden " 
      
    >
      <NavBar
        activeElement={activeElement}
        handleActiveElement={handleActiveElement}
        imageInputRef={imageInputRef}
        handleImageUpload={(e) => {
          e.stopPropagation()
          handleImageUpload({
            file: e.target.files[0],
            canvas: fabricRef as any,
            syncShapeInStorage,
            shapeRef,
          })
        }}
      />
      <section className="flex h-fulll flex-row">
        <LeftSideBar allShapes={Array.from(canvasObjects)} />
        <Live canvasRef={canvasRef} undo={undo} redo={redo}/>
        <RightSideBar 
          elementAttributes={elementAttributes}
          setElementAttributes={setElementAttributes}
          fabricRef={fabricRef}
          isEditingRef={isEditingRef}
          activeObjectRef={activeObjectRef}
          syncShapeInStorage={syncShapeInStorage}
        />
      </section>
    </main>
  );
}
